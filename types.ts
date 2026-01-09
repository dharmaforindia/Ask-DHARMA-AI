export enum Sender {
  User = 'user',
  Bot = 'bot'
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64
  name?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isThinking?: boolean;
  groundingUrls?: string[];
  attachments?: Attachment[];
}

export interface LegalCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export enum AppMode {
  Chat = 'chat',
  Live = 'live',
  Analyze = 'analyze'
}

// For Live API Visualization
export interface AudioVisualizerState {
  isRecording: boolean;
  volume: number;
}

export type Language = 'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Kannada' | 'Malayalam' | 'Marathi' | 'Bengali' | 'Gujarati' | 'Punjabi';

// History & Session Types
export type RetentionPeriod = '7d' | '30d' | 'none';

export interface ChatSession {
  id: string;
  title: string; // Usually the first user query or "New Chat"
  timestamp: number; // Creation time
  messages: Message[];
  category?: LegalCategory | null; // Context if selected
}