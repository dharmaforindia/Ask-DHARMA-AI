import React, { useState, useRef, useEffect } from 'react';
import { Message, Sender, ChatSession, Language, Attachment } from '../types';
import { sendLegalQuery, transcribeAudio, generateSpeech } from '../services/geminiService';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import DharmaLogo from './DharmaLogo';

interface Props {
  session: ChatSession;
  onUpdateSession: (updatedSession: ChatSession) => void;
  language: Language;
  userName?: string;
}

// --- Text Formatting Helpers ---

const parseInlineFormatting = (text: string) => {
  if (!text) return null;
  
  // Split by bold markers (**text**)
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/30 px-1 rounded mx-0.5">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const renderFormattedMessage = (text: string, sender: Sender) => {
  if (sender === Sender.User) {
    return <div className="whitespace-pre-wrap font-sans text-[15px] md:text-base">{text}</div>;
  }

  // Pre-process: ensure newlines are respected but excessive ones are trimmed
  const lines = text.split('\n');
  
  return (
    <div className="space-y-3 font-sans text-[15px] md:text-base leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1 md:h-2" />;

        // Headings (###) - Use Serif Font
        if (trimmed.startsWith('### ')) {
           return (
             <h3 key={i} className="text-lg md:text-xl font-serif font-bold text-blue-800 dark:text-blue-300 mt-5 md:mt-6 mb-2 border-l-4 border-blue-500 pl-3">
               {parseInlineFormatting(trimmed.replace(/^###\s+/, ''))}
             </h3>
           );
        }
        if (trimmed.startsWith('## ')) {
           return (
             <h2 key={i} className="text-xl md:text-2xl font-serif font-bold text-blue-900 dark:text-blue-200 mt-6 md:mt-8 mb-3 md:mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
               {parseInlineFormatting(trimmed.replace(/^##\s+/, ''))}
             </h2>
           );
        }

        // Bullet Points
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 md:gap-3 pl-1 md:pl-2 group">
              <span className="text-blue-500 dark:text-blue-400 mt-2 text-[6px] md:text-[8px] shrink-0 group-hover:scale-125 transition-transform">●</span>
              <div className="text-gray-700 dark:text-gray-300">
                {parseInlineFormatting(trimmed.replace(/^[-•*]\s+/, ''))}
              </div>
            </div>
          );
        }

        // Numbered Lists
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\./);
          const number = match ? match[1] : '';
          const content = trimmed.replace(/^\d+\.\s/, '');
          return (
             <div key={i} className="flex gap-2 md:gap-3 pl-1 md:pl-2 group">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 min-w-[20px] md:min-w-[24px] text-right shrink-0">{number}.</span>
                <div className="text-gray-700 dark:text-gray-300">
                   {parseInlineFormatting(content)}
                </div>
             </div>
          );
        }

        // Table Row (Simple detection)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
           const cells = trimmed.split('|').filter(c => c.trim() !== '');
           if (trimmed.includes('---')) return null; // Skip separator lines
           
           return (
              <div key={i} className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                 {cells.map((cell, idx) => (
                    <div key={idx} className="font-medium text-gray-800 dark:text-gray-200 truncate min-w-[80px]">
                       {cell.trim()}
                    </div>
                 ))}
              </div>
           );
        }

        // Regular Paragraph
        return (
          <p key={i} className="text-gray-800 dark:text-gray-200">
            {parseInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
};

const ChatInterface: React.FC<Props> = ({ session, onUpdateSession, language, userName }) => {
  // We keep a local state for messages to render UI quickly, but we sync it with props
  const [messages, setMessages] = useState<Message[]>(session.messages);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useCaseLaw, setUseCaseLaw] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Attachment State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // TTS State
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with prop changes (e.g. switching sessions)
  useEffect(() => {
    setMessages(session.messages);
    setLoading(false);
    stopSpeaking(); // Stop speech if switching sessions
    setAttachments([]); // Clear attachments
  }, [session.id, session.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, attachments]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const updateParent = (newMessages: Message[]) => {
    setMessages(newMessages);
    // Determine title if it's the first real message
    let title = session.title;
    const firstUserMsg = newMessages.find(m => m.sender === Sender.User);
    if (session.title === 'New Chat' && firstUserMsg) {
       title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
    }
    
    onUpdateSession({
      ...session,
      messages: newMessages,
      title: title
    });
  };

  const handleSendSafe = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: Sender.User,
      timestamp: Date.now(),
      attachments: [...attachments] // store copy of attachments
    };

    // Update UI immediately with user message
    const initialMessages = [...messages, userMsg];
    setMessages(initialMessages);
    updateParent(initialMessages); // Sync state with parent

    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]); // Clear UI immediately
    setLoading(true);

    try {
      // Prepare history
      const history = initialMessages
        .filter(m => m.id !== 'welcome')
        .map(m => {
          return {
            role: m.sender === Sender.User ? 'user' : 'model',
            parts: [{ text: m.text }]
          };
        });

      let finalQuery = input;
      if (session.category) {
        finalQuery = `[Context: ${session.category.name} - ${session.category.description}] ${input}`;
      }

      // If no text but has attachments, provide a default prompt
      if (!finalQuery.trim() && currentAttachments.length > 0) {
        finalQuery = "Please analyze these files.";
      }

      // Prepare placeholder for streaming response
      const botMsgId = (Date.now() + 1).toString();
      let isFirstChunk = true;

      const response = await sendLegalQuery(
        finalQuery, 
        history, 
        language, 
        useThinking, 
        useSearch, 
        useCaseLaw, 
        currentAttachments,
        (partialText) => {
          if (isFirstChunk) {
            setLoading(false);
            isFirstChunk = false;
            // Add bot message on first chunk
            setMessages(prev => [
              ...prev,
              {
                id: botMsgId,
                text: partialText,
                sender: Sender.Bot,
                timestamp: Date.now(),
                isThinking: useThinking
              }
            ]);
          } else {
            // Update existing bot message
            setMessages(prev => {
              const newArr = [...prev];
              const idx = newArr.findIndex(m => m.id === botMsgId);
              if (idx !== -1) {
                newArr[idx] = { ...newArr[idx], text: partialText };
              }
              return newArr;
            });
          }
        }
      );

      // Final update with grounding data
      const finalBotMsg: Message = {
        id: botMsgId,
        text: response.text,
        sender: Sender.Bot,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls,
        isThinking: useThinking
      };

      updateParent([...initialMessages, finalBotMsg]);

    } catch (error) {
      console.error("Error sending message:", error);
      setLoading(false);
    }
  };

  const handleRetry = async (index: number) => {
    const userMsgIndex = index - 1;
    const userMsg = messages[userMsgIndex];

    if (!userMsg || userMsg.sender !== Sender.User) return;

    // Reset to state before the bot message
    const historyForRetry = messages.slice(0, index); 
    setMessages(historyForRetry); // Local update
    setLoading(true);
    
    try {
      const apiHistory = messages.slice(0, userMsgIndex)
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.sender === Sender.User ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      let finalQuery = userMsg.text;
      if (session.category) {
        finalQuery = `[Context: ${session.category.name} - ${session.category.description}] ${userMsg.text}`;
      }
      
      // Retry with original attachments if any
      const retryAttachments = userMsg.attachments || [];

      // Prepare placeholder for streaming response
      const botMsgId = (Date.now() + 1).toString();
      let isFirstChunk = true;

      const response = await sendLegalQuery(
        finalQuery, 
        apiHistory, 
        language, 
        useThinking, 
        useSearch, 
        useCaseLaw, 
        retryAttachments,
        (partialText) => {
          if (isFirstChunk) {
            setLoading(false);
            isFirstChunk = false;
            setMessages(prev => [
              ...prev,
              {
                id: botMsgId,
                text: partialText,
                sender: Sender.Bot,
                timestamp: Date.now(),
                isThinking: useThinking
              }
            ]);
          } else {
            setMessages(prev => {
              const newArr = [...prev];
              const idx = newArr.findIndex(m => m.id === botMsgId);
              if (idx !== -1) {
                newArr[idx] = { ...newArr[idx], text: partialText };
              }
              return newArr;
            });
          }
        }
      );

      const finalBotMsg: Message = {
        id: botMsgId,
        text: response.text,
        sender: Sender.Bot,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls,
        isThinking: useThinking
      };

      updateParent([...historyForRetry, finalBotMsg]);
    } catch (error) {
      console.error("Error retrying message:", error);
      setLoading(false);
    }
  };

  // --- File Upload Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          
          setAttachments(prev => [...prev, {
            mimeType: file.type,
            data: base64Data,
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      });
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // --- Audio Recording Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Use webm for browser compat
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1]; // Remove header
          
          setLoading(true);
          const transcription = await transcribeAudio(base64Data, 'audio/webm');
          setLoading(false);
          
          if (transcription) {
            setInput(prev => prev ? `${prev} ${transcription}` : transcription);
          }
        };
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone Access Error", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- TTS Logic ---
  const speakMessage = async (text: string, id: string) => {
    if (speakingId === id) {
      stopSpeaking();
      return;
    }

    stopSpeaking(); // Stop any current speech
    setSpeakingId(id);

    // Clean markdown before speaking
    const cleanText = text.replace(/[*#]/g, '');

    const audioBuffer = await generateSpeech(cleanText);
    
    if (audioBuffer && speakingId === id) { 
       const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
       audioContextRef.current = ctx;
       const source = ctx.createBufferSource();
       source.buffer = audioBuffer;
       source.connect(ctx.destination);
       source.onended = () => setSpeakingId(null);
       source.start();
       sourceNodeRef.current = source;
    } else {
       setSpeakingId(null);
    }
  };

  const stopSpeaking = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    sourceNodeRef.current = null;
    audioContextRef.current = null;
    setSpeakingId(null);
  };

  const handleDownload = async (text: string) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "Ask DHARMA - Legal Consultation Record",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 } // twips
            }),
             new Paragraph({
              children: [
                 new TextRun({
                    text: `Generated on: ${new Date().toLocaleString()}`,
                    italics: true,
                    color: "666666",
                    size: 20
                 })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...text.split('\n').map(line => {
                let cleanLine = line;
                let hasBullet = false;
                
                // Basic detection for bullet points often returned by AI
                if (line.trim().startsWith('• ') || line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    hasBullet = true;
                    cleanLine = line.trim().substring(2);
                }

                // Remove MD Headings symbols
                cleanLine = cleanLine.replace(/^#{1,3}\s+/, '');

                // Basic Markdown Bold Parsing: **text**
                const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                const children = parts.map(part => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                         return new TextRun({ text: part.slice(2, -2), bold: true, size: 24 });
                    }
                    return new TextRun({ text: part, size: 24 });
                });

                return new Paragraph({
                    children: children,
                    spacing: { after: 120 },
                    bullet: hasBullet ? { level: 0 } : undefined
                });
            }),
            new Paragraph({
               children: [
                  new TextRun({
                     text: "\nDisclaimer: This document was generated by Ask DHARMA AI. It is for informational purposes only and does not constitute professional legal advice. Consult a qualified advocate for official legal counsel.",
                     italics: true,
                     color: "808080",
                     size: 16 // 8pt
                  })
               ],
               spacing: { before: 600 }
            })
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DHARMA-Consultation-${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
    } catch (e) {
      console.error("Error generating docx:", e);
      alert("Could not generate document.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendSafe();
    }
  };

  const handleCopy = (text: string, id: string) => {
    // Copy clean text without markdown symbols
    const cleanText = text.replace(/\*\*/g, '').replace(/^###\s+/gm, '').replace(/^##\s+/gm, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (text: string) => {
    const cleanText = text.replace(/\*\*/g, '').replace(/^###\s+/gm, '').replace(/^##\s+/gm, '');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Legal Insight from Ask DHARMA',
          text: cleanText,
        });
      } catch (err) {
        console.debug('Share cancelled');
      }
    } else {
      alert("Sharing is not supported on this device/browser. Text copied to clipboard.");
      navigator.clipboard.writeText(cleanText);
    }
  };

  const renderAttachmentPreview = (att: Attachment) => {
    if (att.mimeType.startsWith('image/')) {
      return <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover" />;
    }
    if (att.mimeType === 'application/pdf') {
       return (
         <div className="flex flex-col items-center justify-center h-full text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-[10px] font-bold mt-1">PDF</span>
         </div>
       );
    }
    // Default Icon
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
           <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
         </svg>
         <span className="text-[10px] font-bold mt-1 uppercase">{att.mimeType.split('/')[1] || 'FILE'}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-black md:bg-white md:dark:bg-neutral-900 md:rounded-xl md:border border-gray-200 dark:border-neutral-800 overflow-hidden shadow-sm md:shadow-2xl relative transition-colors duration-300">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-5 md:space-y-8 bg-gray-50 dark:bg-black md:bg-white md:dark:bg-neutral-900 scrollbar-hide transition-colors duration-300">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`w-full flex gap-3 md:gap-4 ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}>
              
              {/* Bot Avatar */}
              {msg.sender === Sender.Bot && (
                <div className="shrink-0 mt-1">
                   <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-gray-200 dark:border-neutral-700 bg-white dark:bg-black p-1 flex items-center justify-center">
                      <DharmaLogo className="w-full h-full" />
                   </div>
                </div>
              )}

              <div 
                className={`relative group max-w-[90%] md:max-w-[85%] ${
                  msg.sender === Sender.User 
                    ? 'bg-[#f0f4f9] dark:bg-[#1e1f20] text-gray-900 dark:text-gray-100 rounded-[18px] md:rounded-[20px] px-4 py-3 md:px-5 md:py-3.5' 
                    : 'bg-transparent text-gray-900 dark:text-gray-100 px-0 py-0 w-full'
                }`}
              >
                {msg.isThinking && <div className="text-xs text-blue-500 dark:text-blue-400 mb-2 font-mono flex items-center gap-1">Reasoned Response</div>}
                
                {/* Attachment Display in Message History */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="w-20 h-20 md:w-32 md:h-32 bg-gray-100 dark:bg-neutral-900 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
                         {renderAttachmentPreview(att)}
                      </div>
                    ))}
                  </div>
                )}

                {/* --- CUSTOM RICH TEXT RENDERER --- */}
                {renderFormattedMessage(msg.text, msg.sender)}

                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className={`mt-4 pt-3 border-t ${msg.sender === Sender.User ? 'border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-neutral-800'}`}>
                    <p className={`text-xs font-bold mb-1 ${msg.sender === Sender.User ? 'text-gray-500 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>SOURCES:</p>
                    <ul className="space-y-1">
                      {msg.groundingUrls.map((url, idx) => (
                        <li key={idx}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons for Bot Messages */}
                {msg.sender === Sender.Bot && (
                  <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-3 pt-2 md:pt-3 justify-start opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                     {/* Read Aloud Button */}
                     <button
                       onClick={() => speakMessage(msg.text, msg.id)}
                       className={`flex items-center gap-1 text-xs transition-colors p-2 rounded-full ${speakingId === msg.id ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
                       title="Read Aloud"
                     >
                       {speakingId === msg.id ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-4 md:h-4 animate-pulse">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                          </svg>
                       ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                          </svg>
                       )}
                     </button>

                     {/* Retry Button */}
                     {index > 0 && messages[index-1].sender === Sender.User && (
                       <button
                         onClick={() => handleRetry(index)}
                         className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                         title="Retry response"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                         </svg>
                       </button>
                     )}

                     {/* Save as Document Button */}
                     <button 
                       onClick={() => handleDownload(msg.text)}
                       className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                       title="Save as .docx"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-4 md:h-4">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                       </svg>
                     </button>

                     {/* Copy Button */}
                     <button 
                       onClick={() => handleCopy(msg.text, msg.id)}
                       className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                       title="Copy to clipboard"
                     >
                       {copiedId === msg.id ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                         </svg>
                       ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                         </svg>
                       )}
                     </button>
                     
                     {/* Share Button */}
                     <button 
                       onClick={() => handleShare(msg.text)}
                       className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                       title="Share response"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                       </svg>
                     </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start gap-4">
               <div className="shrink-0 mt-1">
                   <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-neutral-700 bg-white dark:bg-black p-1 flex items-center justify-center animate-pulse">
                      <DharmaLogo className="w-full h-full opacity-50" />
                   </div>
               </div>
               <div className="flex items-center gap-2 mt-2">
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Settings Bar */}
      <div className="px-2 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-neutral-800 flex items-center gap-2 md:gap-4 text-xs overflow-x-auto no-scrollbar whitespace-nowrap justify-center">
         <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-900 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full border border-gray-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-colors text-[11px] md:text-xs shadow-sm">
            <input type="checkbox" checked={useThinking} onChange={(e) => setUseThinking(e.target.checked)} className="rounded border-gray-300 dark:border-neutral-700" />
            <span>Deep Thinking</span>
         </label>
         <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-900 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full border border-gray-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-colors text-[11px] md:text-xs shadow-sm">
            <input type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} className="rounded border-gray-300 dark:border-neutral-700" />
            <span>Web Search</span>
         </label>
         <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-900 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full border border-gray-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-colors text-[11px] md:text-xs shadow-sm">
            <input type="checkbox" checked={useCaseLaw} onChange={(e) => setUseCaseLaw(e.target.checked)} className="rounded border-gray-300 dark:border-neutral-700" />
            <span>Case Laws</span>
         </label>
      </div>

      {/* Input Area */}
      <div className="p-2 md:p-4 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 shrink-0 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          {/* Attachment Preview Area */}
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
              {attachments.map((att, i) => (
                <div key={i} className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 bg-gray-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-gray-300 dark:border-neutral-700 group">
                  {renderAttachmentPreview(att)}
                  <button 
                    onClick={() => removeAttachment(i)}
                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-1 md:gap-2 bg-gray-100 dark:bg-black rounded-[24px] md:rounded-[28px] border border-transparent focus-within:border-gray-300 dark:focus-within:border-neutral-700 focus-within:bg-white dark:focus-within:bg-[#0f0f0f] transition-all p-1.5 md:p-2">
            {/* File Upload Button */}
            <button
               onClick={() => fileInputRef.current?.click()}
               className="p-2.5 md:p-3 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white rounded-full transition-colors shrink-0"
               title="Upload Files (Images, Docs, Audio, Video)"
            >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
               </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileSelect}
              multiple 
              accept="image/*,application/pdf,audio/*,video/*,text/*"
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask DHARMA"
              className="w-full bg-transparent text-gray-900 dark:text-white border-none focus:ring-0 resize-none min-h-[48px] md:min-h-[52px] max-h-[150px] text-[16px] placeholder-gray-500 py-3 md:py-3.5"
              rows={1}
            />

            <div className="flex items-center gap-1 pr-1 pb-1">
               {/* Mic Button - Speech to Text */}
               {!input.trim() && (
                  <button
                     onClick={isRecording ? stopRecording : startRecording}
                     className={`p-2.5 md:p-3 rounded-full transition-all shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800'}`}
                     title={isRecording ? "Stop Recording" : "Speech to Text"}
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                     </svg>
                  </button>
               )}
               
               {input.trim() && (
                 <button 
                   onClick={handleSendSafe}
                   disabled={loading}
                   className="p-2.5 md:p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                   </svg>
                 </button>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;