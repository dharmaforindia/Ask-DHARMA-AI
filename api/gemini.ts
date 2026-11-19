// Server-side Gemini access for Ask DHARMA (a Vercel Function, served at POST /api/gemini).
//
// The Gemini API key lives only here, read from the GEMINI_API_KEY environment variable
// (API_KEY also works). The browser never sees it. The browser sends an "action" plus its
// inputs; this file chooses the models and the system instruction, so the endpoint cannot be
// used as a general-purpose Gemini proxy.
//
// This file is deliberately self-contained (it imports only npm packages), so Vercel can
// deploy it without resolving local TypeScript imports.
import { GoogleGenAI, Modality } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are DHARMA, a world-class expert Indian Legal Advisor. 
Your purpose is to assist users with legal questions based on the Jurisdiction of India.

CRITICAL UPDATE: You must PRIMARILY use the new Criminal Laws of India implemented in 2024:
1. **Bharatiya Nyaya Sanhita (BNS)** (Replaces IPC)
2. **Bharatiya Nagarik Suraksha Sanhita (BNSS)** (Replaces CrPC)
3. **Bharatiya Sakshya Adhiniyam (BSA)** (Replaces Indian Evidence Act)

Always reference the relevant BNS/BNSS sections first, but provide the corresponding old IPC/CrPC sections in parentheses for context if necessary.

GUIDELINES:
- Use clear, professional, yet accessible language.
- Structure answers logically (Issue -> Rule -> Analysis -> Conclusion).
- Be objective and neutral. Disclaimer: "This is for informational purposes only and does not constitute professional legal counsel."

STRICT FORMATTING RULE:
- FORMAT ALL RESPONSES WITH CLEAR MARKDOWN STRUCTURE.
- Use **"### "** for Section Headings (e.g., ### Legal Analysis).
- Use **"**"** for Bold Key Terms (e.g., **Section 302 BNS**).
- Use **"- "** for Bullet Points.
- Use **"1. "** for Numbered Steps.
- Ensure the response is scannable and digestible.
- Do NOT use plain text blocks without structure.

SPECIFIC KNOWLEDGE BASE - IP PROTECTION FOR AI & SOFTWARE IN INDIA:
| Asset | Protection Method | Difficulty in India |
|---|---|---|
| Source Code | Copyright | Easy |
| Model Weights | Trade Secret / Contract Law | Moderate |
| Unique Algorithm | Patent (if "Technical Effect" shown) | High |
| Training Dataset | Database Right / Copyright | Moderate |
`;

const MODELS = {
  chat: "gemini-3-flash-preview",
  reasoning: "gemini-3-pro-preview",
  analyze: "gemini-3-pro-preview", // Pro is better for OCR and analysis
  transcribe: "gemini-3-flash-preview",
  speech: "gemini-2.5-flash-preview-tts",
  live: "gemini-2.5-flash-native-audio-preview-12-2025",
};

const VOICE_NAME = "Kore";

const LANGUAGES = [
  "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi",
];

// Input limits. Vercel also rejects request bodies over 4.5 MB.
const MAX_TEXT_CHARS = 20000;
const MAX_HISTORY_MESSAGES = 60;
const MAX_FILES_PER_MESSAGE = 10;

type InlineFile = { mimeType: string; data: string };
type HistoryEntry = { role: "user" | "model"; parts: ({ text: string } | { inlineData: InlineFile })[] };

class BadRequest extends Error {}

function getApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.API_KEY || "";
}

function createClient(apiVersion?: string): GoogleGenAI {
  // GEMINI_API_BASE_URL is only for local tests against a fake Gemini server.
  const baseUrl = process.env.GEMINI_API_BASE_URL;
  const httpOptions: { apiVersion?: string; baseUrl?: string } = {};
  if (apiVersion) httpOptions.apiVersion = apiVersion;
  if (baseUrl) httpOptions.baseUrl = baseUrl;
  return new GoogleGenAI({ apiKey: getApiKey(), httpOptions });
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// Browsers always send Origin on a POST. Refusing other sites' origins stops other web pages
// from using this endpoint through their visitors' browsers. It does not stop scripts that
// send requests directly, so keep a quota on the Gemini key as well.
function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// --- Input validation ---

function readText(value: unknown, name: string, { allowEmpty = false } = {}): string {
  if (typeof value !== "string") throw new BadRequest(`${name} must be a string`);
  if (!allowEmpty && !value.trim()) throw new BadRequest(`${name} is empty`);
  if (value.length > MAX_TEXT_CHARS) throw new BadRequest(`${name} is too long`);
  return value;
}

function readLanguage(value: unknown): string {
  return typeof value === "string" && LANGUAGES.includes(value) ? value : "English";
}

function readFile(value: unknown): InlineFile {
  const file = value as InlineFile;
  if (!file || typeof file.mimeType !== "string" || typeof file.data !== "string" || !file.data) {
    throw new BadRequest("Invalid file");
  }
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(file.mimeType)) throw new BadRequest("Invalid file type");
  return { mimeType: file.mimeType, data: file.data };
}

function readFiles(value: unknown): InlineFile[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_FILES_PER_MESSAGE) throw new BadRequest("Invalid files");
  return value.map(readFile);
}

function readHistory(value: unknown): HistoryEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) throw new BadRequest("Invalid history");
  return value.map((entry: any) => {
    if (!entry || (entry.role !== "user" && entry.role !== "model") || !Array.isArray(entry.parts)) {
      throw new BadRequest("Invalid history entry");
    }
    if (entry.parts.length > MAX_FILES_PER_MESSAGE + 1) throw new BadRequest("Invalid history entry");
    const parts = entry.parts.map((part: any) =>
      part && typeof part.text === "string"
        ? { text: readText(part.text, "history text", { allowEmpty: true }) }
        : { inlineData: readFile(part?.inlineData) }
    );
    return { role: entry.role, parts };
  });
}

// --- Actions ---

// Streams the reply as newline-delimited JSON: {"text": "..."} lines, then
// {"done": true, "groundingUrls": [...]}, or {"error": "..."} if the stream breaks.
async function chat(body: any): Promise<Response> {
  const query = readText(body.query, "query");
  const language = readLanguage(body.language);
  const useReasoning = body.useReasoning === true;
  const useSearch = body.useSearch === true;
  const useCaseLaw = body.useCaseLaw === true;
  const history = readHistory(body.history);
  const files = readFiles(body.attachments);

  let instruction = `${SYSTEM_INSTRUCTION}\nIMPORTANT: Respond in the ${language} language.`;
  if (useCaseLaw) {
    instruction += "\nCITATION MODE: Actively search for and cite specific Supreme Court of India or High Court judgments, case names, and legal precedents relevant to this query. Mention the case name and year clearly.";
  }

  const config: any = { systemInstruction: instruction };
  // Search is needed for case law too, to find judgments.
  if (useSearch || useCaseLaw) config.tools = [{ googleSearch: {} }];
  if (useReasoning) config.thinkingConfig = { thinkingBudget: 32768 };

  const session = createClient().chats.create({
    model: useReasoning ? MODELS.reasoning : MODELS.chat,
    config,
    history,
  });

  const message = files.length > 0
    ? [...files.map(file => ({ inlineData: file })), { text: query }]
    : query;

  // Errors before the first chunk (bad key, quota, invalid input) surface here, as a 502.
  const stream = await session.sendMessageStream({ message });

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, data: unknown) =>
    controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        const groundingUrls: string[] = [];
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) send(controller, { text });
            const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            for (const source of sources) {
              const uri = source.web?.uri;
              if (uri && !groundingUrls.includes(uri)) groundingUrls.push(uri);
            }
          }
          send(controller, { done: true, groundingUrls });
        } catch (err) {
          console.error("Gemini chat stream failed", err);
          send(controller, { error: "The reply was interrupted." });
        }
        controller.close();
      },
    }),
    { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } }
  );
}

async function analyze(body: any): Promise<Response> {
  const file = readFile(body.file);
  const prompt = readText(body.prompt, "prompt");
  const response = await createClient().models.generateContent({
    model: MODELS.analyze,
    contents: {
      parts: [
        { inlineData: file },
        { text: `Analyze this legal document in the context of Indian Law. ${prompt}` },
      ],
    },
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  return json(200, { text: response.text || "" });
}

async function transcribe(body: any): Promise<Response> {
  const file = readFile(body.file);
  const response = await createClient().models.generateContent({
    model: MODELS.transcribe,
    contents: {
      parts: [
        { inlineData: file },
        { text: "Transcribe this audio exactly as spoken. Return only the text." },
      ],
    },
  });
  return json(200, { text: response.text || "" });
}

// Returns raw 16-bit PCM audio at 24 kHz. It is streamed rather than sent as one JSON body,
// because a long answer read aloud can be several megabytes.
async function speech(body: any): Promise<Response> {
  const text = readText(body.text, "text");
  const response = await createClient().models.generateContent({
    model: MODELS.speech,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return json(502, { error: "No audio was returned." });

  const bytes = Buffer.from(base64Audio, "base64");
  const CHUNK = 256 * 1024;
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += CHUNK) {
          controller.enqueue(new Uint8Array(bytes.subarray(i, i + CHUNK)));
        }
        controller.close();
      },
    }),
    { headers: { "content-type": "application/octet-stream", "x-sample-rate": "24000", "cache-control": "no-store" } }
  );
}

// Creates a short-lived, single-use token for one voice consultation. The model, voice and
// system instruction are locked into the token, so it cannot be used for anything else.
async function liveToken(body: any): Promise<Response> {
  const language = readLanguage(body.language);
  const now = Date.now();
  const token = await createClient("v1alpha").authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(now + 60 * 60 * 1000).toISOString(), // the consultation can last up to 1 hour
      newSessionExpireTime: new Date(now + 60 * 1000).toISOString(), // must be used within 1 minute
      liveConnectConstraints: {
        model: MODELS.live,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
          systemInstruction: `${SYSTEM_INSTRUCTION}\nIMPORTANT: Speak in ${language}. Keep responses legal but concise.`,
        },
      },
      lockAdditionalFields: [],
    },
  });
  if (!token.name) return json(502, { error: "No token was returned." });
  return json(200, { token: token.name, model: MODELS.live });
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) return json(403, { error: "Requests from other sites are not allowed." });
  if (!getApiKey()) {
    console.error("GEMINI_API_KEY is not set on the server.");
    return json(500, { error: "The server is not configured: GEMINI_API_KEY is missing." });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  try {
    switch (body?.action) {
      case "chat": return await chat(body);
      case "analyze": return await analyze(body);
      case "transcribe": return await transcribe(body);
      case "speech": return await speech(body);
      case "live-token": return await liveToken(body);
      default: return json(400, { error: "Unknown action" });
    }
  } catch (err) {
    if (err instanceof BadRequest) return json(400, { error: err.message });
    console.error(`Gemini ${body?.action} request failed`, err);
    return json(502, { error: "The AI service could not complete the request." });
  }
}
