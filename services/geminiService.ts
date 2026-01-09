import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { Attachment } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Types ---
interface ChatResponse {
  text: string;
  groundingUrls: string[];
}

// --- Text Chat Service ---
export const sendLegalQuery = async (
  query: string,
  history: { role: string; parts: { text: string; inlineData?: any }[] }[],
  language: string,
  useReasoning: boolean = false,
  useSearch: boolean = false,
  useCaseLaw: boolean = false,
  attachments: Attachment[] = [],
  onStreamUpdate?: (text: string) => void
): Promise<ChatResponse> => {
  
  // Default to Gemini 3 models
  // If attachments are present (images/video/pdf), ensure we use a model that supports them well.
  // Gemini 3 Flash/Pro support multimodal inputs.
  let modelId = useReasoning ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const tools = [];
  // Enable search if requested OR if Case Law is needed (as we need to search for judgments)
  if (useSearch || useCaseLaw) {
    tools.push({ googleSearch: {} });
  }

  let additionalInstruction = `\nIMPORTANT: Respond in the ${language} language.`;
  
  if (useCaseLaw) {
    additionalInstruction += "\nCITATION MODE: Actively search for and cite specific Supreme Court of India or High Court judgments, case names, and legal precedents relevant to this query. Mention the case name and year clearly.";
  }
  
  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION + additionalInstruction,
    tools: tools.length > 0 ? tools : undefined,
  };

  if (useReasoning) {
    // Max thinking budget for Gemini 3 Pro
    config.thinkingConfig = { thinkingBudget: 32768 }; 
  }

  try {
    const chat = ai.chats.create({
      model: modelId,
      config: config,
      history: history,
    });

    let messageContent: any = query;

    if (attachments && attachments.length > 0) {
      // Construct parts: attachments first, then text
      const parts = attachments.map(att => ({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      }));
      parts.push({ text: query } as any);
      messageContent = parts;
    }

    // Stream Mode
    if (onStreamUpdate) {
      const resultStream = await chat.sendMessageStream({ message: messageContent });
      let fullText = "";
      
      for await (const chunk of resultStream) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onStreamUpdate(fullText);
        }
      }

      // Wait for response to complete to get metadata
      const response = await resultStream.response;
      
      const groundingUrls: string[] = [];
      // Fix: Safe access to response and candidates
      const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) groundingUrls.push(chunk.web.uri);
        });
      }

      return { text: fullText, groundingUrls };
    }

    // Classic Mode (Fallback)
    const response = await chat.sendMessage({ message: messageContent });
    
    // Extract Text
    const text = response?.text || "I apologize, I could not generate a response.";

    // Extract Grounding
    const groundingUrls: string[] = [];
    // Fix: Safe access to response and candidates
    const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) groundingUrls.push(chunk.web.uri);
      });
    }

    return { text, groundingUrls };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "An error occurred while consulting DHARMA. Please try again.", groundingUrls: [] };
  }
};

// --- Document Analysis Service ---
export const analyzeLegalDocument = async (
  base64Data: string, 
  mimeType: string,
  userPrompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Pro is better for OCR and Analysis
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Analyze this legal document in the context of Indian Law. ${userPrompt}`
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return response?.text || "Could not analyze the document.";
  } catch (error) {
    console.error("Document Analysis Error:", error);
    return "Failed to analyze document. Please ensure the file is clear and supported.";
  }
};

// --- Audio Services ---

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: "Transcribe this audio exactly as spoken. Return only the text."
          }
        ]
      }
    });
    return response?.text || "";
  } catch (error) {
    console.error("Transcription Error", error);
    return "";
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Decode PCM (24kHz is standard for this model)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const audioBuffer = pcmToAudioBuffer(base64Audio, audioContext, 24000);
    return audioBuffer;

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

// Base64 (Model Output) -> Int16 -> Float32 -> AudioBuffer
export function pcmToAudioBuffer(base64: string, ctx: AudioContext, sampleRate: number = 24000): AudioBuffer {
  const bytes = decode(base64);
  const dataInt16 = new Int16Array(bytes.buffer);
  
  // Create buffer matching the model's output rate (usually 24kHz)
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
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
  
  const langInstruction = `\nIMPORTANT: Speak in ${language}. Keep responses legal but concise.`;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: SYSTEM_INSTRUCTION + langInstruction,
    },
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

  return {
    sendAudioChunk: (data: Float32Array) => {
      const blob = createPcmBlob(data);
      sessionPromise.then(session => {
        session.sendRealtimeInput({ media: blob });
      });
    },
    disconnect: () => {
      sessionPromise.then(session => session.close());
    }
  };
};