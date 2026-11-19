import { GoogleGenAI, LiveServerMessage, Modality, Session } from "@google/genai";
import { Attachment } from "../types";

// All Gemini requests go through the server function in api/gemini.ts, which holds the
// Gemini API key. The browser never sees the key.
const API_URL = "/api/gemini";

// Vercel rejects request bodies over 4.5 MB. Stay a little under that.
const MAX_REQUEST_BYTES = 4_200_000;

export const FILE_TOO_LARGE_MESSAGE =
  "This file is too large to send. Please use a file under about 3 MB, or a smaller photo or scan.";

const CHAT_ERROR_MESSAGE = "An error occurred while consulting DHARMA. Please try again.";

const byteSize = (text: string) => new Blob([text]).size;

const post = (body: string, signal?: AbortSignal) =>
  fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    signal,
  });

// --- Types ---
interface ChatResponse {
  text: string;
  groundingUrls: string[];
}

type HistoryPart = { text?: string; inlineData?: { mimeType: string; data: string } };
type HistoryEntry = { role: string; parts: HistoryPart[] };

// Earlier files are dropped from the history when the request would be too large.
const textOnlyHistory = (history: HistoryEntry[]): HistoryEntry[] =>
  history
    .map(entry => ({ ...entry, parts: entry.parts.filter(part => part.text !== undefined) }))
    .filter(entry => entry.parts.length > 0);

// --- Text Chat Service ---
export const sendLegalQuery = async (
  query: string,
  history: HistoryEntry[],
  language: string,
  useReasoning: boolean = false,
  useSearch: boolean = false,
  useCaseLaw: boolean = false,
  attachments: Attachment[] = [],
  onStreamUpdate?: (text: string) => void
): Promise<ChatResponse> => {
  const payload = {
    action: "chat",
    query,
    history,
    language,
    useReasoning,
    useSearch,
    useCaseLaw,
    attachments: attachments.map(att => ({ mimeType: att.mimeType, data: att.data })),
  };

  let body = JSON.stringify(payload);
  if (byteSize(body) > MAX_REQUEST_BYTES) {
    body = JSON.stringify({ ...payload, history: textOnlyHistory(history) });
  }
  if (byteSize(body) > MAX_REQUEST_BYTES) {
    return { text: FILE_TOO_LARGE_MESSAGE, groundingUrls: [] };
  }

  try {
    const response = await post(body);
    if (!response.ok || !response.body) {
      throw new Error(`Server returned ${response.status}`);
    }

    // The server streams newline-delimited JSON: {"text"} pieces, then {"done", "groundingUrls"}.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let fullText = "";
    let groundingUrls: string[] = [];
    let failed = false;

    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const message = JSON.parse(line);
      if (typeof message.text === "string") {
        fullText += message.text;
        onStreamUpdate?.(fullText);
      }
      if (Array.isArray(message.groundingUrls)) groundingUrls = message.groundingUrls;
      if (message.error) failed = true;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffered.indexOf("\n")) >= 0) {
        handleLine(buffered.slice(0, newline));
        buffered = buffered.slice(newline + 1);
      }
    }
    handleLine(buffered + decoder.decode());

    if (failed) throw new Error("The reply stream was interrupted");
    return { text: fullText || "I apologize, I could not generate a response.", groundingUrls };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: CHAT_ERROR_MESSAGE, groundingUrls: [] };
  }
};

// --- Document Analysis Service ---
export const analyzeLegalDocument = async (
  base64Data: string,
  mimeType: string,
  userPrompt: string
): Promise<string> => {
  const body = JSON.stringify({ action: "analyze", file: { mimeType, data: base64Data }, prompt: userPrompt });
  if (byteSize(body) > MAX_REQUEST_BYTES) return FILE_TOO_LARGE_MESSAGE;

  try {
    const response = await post(body);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const result = await response.json();
    return result.text || "Could not analyze the document.";
  } catch (error) {
    console.error("Document Analysis Error:", error);
    return "Failed to analyze document. Please ensure the file is clear and supported.";
  }
};

// --- Audio Services ---

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const body = JSON.stringify({ action: "transcribe", file: { mimeType, data: base64Audio } });
  if (byteSize(body) > MAX_REQUEST_BYTES) {
    console.error("Transcription Error: recording is too long to send");
    return "";
  }

  try {
    const response = await post(body);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const result = await response.json();
    return result.text || "";
  } catch (error) {
    console.error("Transcription Error", error);
    return "";
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await post(JSON.stringify({ action: "speech", text }));
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    // The server returns raw 16-bit PCM audio.
    const sampleRate = Number(response.headers.get("x-sample-rate")) || 24000;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 2) return null;

    // No AudioContext is needed to build the buffer; the caller plays it.
    return pcmBytesToAudioBuffer(bytes, null, sampleRate);
  } catch (error) {
    console.error("TTS Error", error);
    return null;
  }
};

// --- LIVE API HELPERS ---

// Base64 Decode
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Base64 Encode
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Float32 (Mic) -> Int16 -> Base64 (Model Input)
export function createPcmBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp and scale
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// 16-bit PCM bytes -> Float32 -> AudioBuffer
function pcmBytesToAudioBuffer(bytes: Uint8Array, ctx: BaseAudioContext | null, sampleRate: number): AudioBuffer {
  // Copy into a fresh buffer so the samples are aligned; ignore a trailing odd byte.
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const dataInt16 = new Int16Array(bytes.slice(0, sampleCount * 2).buffer);

  const buffer = ctx
    ? ctx.createBuffer(1, sampleCount, sampleRate)
    : new AudioBuffer({ numberOfChannels: 1, length: sampleCount, sampleRate });
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

// Base64 (Model Output) -> Int16 -> Float32 -> AudioBuffer
export function pcmToAudioBuffer(base64: string, ctx: BaseAudioContext | null, sampleRate: number = 24000): AudioBuffer {
  return pcmBytesToAudioBuffer(decode(base64), ctx, sampleRate);
}

// --- Live Connection ---
interface LiveConnectionCallbacks {
  onAudio: (base64Audio: string) => void;
  onInterrupted: () => void;
  onClose: () => void;
  onError: (error: any) => void;
}

export const connectLiveDharma = async (
  callbacks: LiveConnectionCallbacks,
  language: string
) => {
  // ai.live.connect resolves when the socket opens and never rejects on its own,
  // so a connection that never opens would wait forever without this timeout.
  const LIVE_CONNECT_TIMEOUT_MS = 15000;

  // The server creates a short-lived, single-use token for this consultation. The model,
  // voice and system instruction are locked into the token on the server.
  const tokenResponse = await post(
    JSON.stringify({ action: "live-token", language }),
    AbortSignal.timeout(LIVE_CONNECT_TIMEOUT_MS)
  );
  if (!tokenResponse.ok) {
    throw new Error(`Could not start a voice session (server returned ${tokenResponse.status})`);
  }
  const { token, model } = await tokenResponse.json();

  // Ephemeral tokens only work with the v1alpha Live API.
  const liveAi = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

  const sessionPromise = liveAi.live.connect({
    model,
    config: { responseModalities: [Modality.AUDIO] },
    callbacks: {
      onopen: () => console.log("DHARMA Live Connected"),
      onmessage: (msg: LiveServerMessage) => {
        // Handle Audio
        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          callbacks.onAudio(audioData);
        }

        // Handle Interruption
        if (msg.serverContent?.interrupted) {
          console.log("Model interrupted");
          callbacks.onInterrupted();
        }
      },
      onclose: () => {
        console.log("DHARMA Live Closed");
        callbacks.onClose();
      },
      onerror: (err) => {
        console.error("DHARMA Live Error", err);
        callbacks.onError(err);
      },
    }
  });

  // Wait until the connection is really open, so the UI only says "Listening..." when it is.
  let timedOut = false;
  const session = await new Promise<Session>((resolve, reject) => {
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("Timed out connecting to DHARMA Live"));
    }, LIVE_CONNECT_TIMEOUT_MS);

    sessionPromise.then(
      (s) => {
        clearTimeout(timer);
        if (timedOut) {
          s.close(); // Opened too late: the caller has already given up.
        } else {
          resolve(s);
        }
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });

  return {
    sendAudioChunk: (data: Float32Array) => {
      try {
        session.sendRealtimeInput({ media: createPcmBlob(data) });
      } catch (err) {
        console.error("DHARMA Live send error", err);
      }
    },
    disconnect: () => {
      try {
        session.close();
      } catch (err) {
        console.error("DHARMA Live close error", err);
      }
    }
  };
};
