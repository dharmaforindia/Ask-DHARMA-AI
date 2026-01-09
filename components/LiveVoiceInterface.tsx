import React, { useEffect, useState, useRef } from 'react';
import { connectLiveDharma, pcmToAudioBuffer } from '../services/geminiService';
import { Language } from '../types';

interface Props {
  language: Language;
}

const LiveVoiceInterface: React.FC<Props> = ({ language }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Ready to Connect");
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  // We separate Input (16kHz for Gemini) and Output (24kHz for Playback) 
  // to avoid sample rate mismatch issues and simplify processing.
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Connection Refs
  const sendAudioRef = useRef<((data: Float32Array) => void) | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);
  
  // Visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const visualize = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isActive) return; // Stop if not active
      
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      // Determine theme colors dynamically based on document class
      const isDark = document.documentElement.classList.contains('dark');
      const barColor = isDark ? '255, 255, 255' : '0, 0, 0';

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // Draw bars (simple frequency viz)
      // We only draw low-mid frequencies which correspond to voice
      const barsToDraw = 20; 
      const step = Math.floor(bufferLength / 2 / barsToDraw);

      for (let i = 0; i < barsToDraw; i++) {
        const index = i * step;
        const value = dataArray[index];
        
        barHeight = (value / 255) * height;
        
        ctx.fillStyle = `rgba(${barColor}, ${value / 255})`;
        ctx.fillRect(x, (height - barHeight) / 2, (width / barsToDraw) - 2, barHeight);

        x += width / barsToDraw;
      }
    };

    draw();
  };

  const startSession = async () => {
    setError(null);
    setStatus("Initialize Audio...");

    try {
      // 1. Setup Input Context (16kHz required by Gemini Live)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;

      // 2. Setup Output Context (24kHz standard for Gemini Voice 'Kore')
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      outputContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime; // Reset cursor

      // 3. Mic Access
      setStatus("Requesting Mic...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);

      // 4. Analyzer for Viz
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser); // Connect source to analyser

      // 5. Processor for sending data
      // Buffer size 4096 gives ~0.25s latency chunk at 16kHz
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!sendAudioRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        sendAudioRef.current(inputData);
      };
      
      // Connect graph: Source -> Analyser -> Processor -> Destination
      // (Destination is needed for ScriptProcessor to run in some browsers)
      analyser.connect(processor);
      processor.connect(inputCtx.destination);

      setStatus("Connecting to DHARMA...");

      // 6. Connect to API
      const { sendAudioChunk, disconnect } = await connectLiveDharma(
        {
          onAudio: (base64Audio) => {
            // Received audio from model
            const ctx = outputContextRef.current;
            if (!ctx) return;

            // Decode and Play
            try {
              const buffer = pcmToAudioBuffer(base64Audio, ctx, 24000);
              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = buffer;
              sourceNode.connect(ctx.destination);
              
              // Gapless Playback Logic
              // Schedule next chunk at the end of the previous one
              // If we fell behind (buffer underrun), start immediately
              const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
              sourceNode.start(startTime);
              
              // Update cursor
              nextStartTimeRef.current = startTime + buffer.duration;
              
              // Track node to stop if needed
              audioQueueRef.current.push(sourceNode);
              sourceNode.onended = () => {
                 // Remove from queue when done
                 const idx = audioQueueRef.current.indexOf(sourceNode);
                 if (idx > -1) audioQueueRef.current.splice(idx, 1);
              };

            } catch (e) {
              console.error("Audio Decode Error", e);
            }
          },
          onInterrupted: () => {
            // Model was interrupted (or we interrupted it), clear queue
            stopAllPlayback();
          },
          onClose: () => {
            stopSession();
          },
          onError: (err) => {
            setError("Connection Error");
            stopSession();
          }
        },
        language
      );

      sendAudioRef.current = sendAudioChunk;
      disconnectRef.current = disconnect;
      
      setIsActive(true);
      setStatus("Listening...");
      
      // Start viz
      visualize();

    } catch (err) {
      console.error(err);
      setError("Microphone access failed or Connection rejected.");
      setStatus("Error");
      stopSession();
    }
  };

  const stopAllPlayback = () => {
    // Stop all currently playing nodes
    audioQueueRef.current.forEach(node => {
      try { node.stop(); } catch(e) {}
    });
    audioQueueRef.current = [];
    
    // Reset cursor to 'now' so next speech starts immediately
    if (outputContextRef.current) {
       nextStartTimeRef.current = outputContextRef.current.currentTime;
    }
  };

  const stopSession = () => {
    // 1. Disconnect API
    if (disconnectRef.current) disconnectRef.current();
    disconnectRef.current = null;
    sendAudioRef.current = null;

    // 2. Stop Viz
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    // 3. Close Contexts
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }

    analyserRef.current = null;
    audioQueueRef.current = [];
    
    setIsActive(false);
    setStatus("Disconnected");
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 md:p-8 items-center justify-center relative overflow-hidden transition-colors duration-300">
       {/* Background Decoration */}
       <div className={`absolute inset-0 bg-black dark:bg-white opacity-5 transition-opacity duration-1000 ${isActive ? 'animate-pulse' : 'hidden'}`}></div>

       <div className="z-10 text-center space-y-6 md:space-y-8 max-w-lg mx-auto w-full">
         <h2 className="text-2xl md:text-3xl font-serif text-gray-900 dark:text-white mb-2">DHARMA Live</h2>
         <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base px-2">
           Speak naturally to DHARMA in {language}. Ask about recent judgments, clarify legal terms, or discuss case strategy in real-time.
         </p>

         <div className="h-24 md:h-32 w-full max-w-[250px] mx-auto flex items-center justify-center bg-gray-100 dark:bg-black/50 rounded-xl border border-gray-200 dark:border-neutral-800 transition-colors relative">
            <canvas ref={canvasRef} width={250} height={128} className="w-full h-full object-contain p-2" />
            
            {/* Overlay if not active */}
            {!isActive && (
               <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
               </div>
            )}
         </div>

         <div className="text-lg md:text-xl font-mono text-blue-600 dark:text-blue-400 min-h-[1.5rem]">{status}</div>
         {error && <div className="text-red-500 text-sm">{error}</div>}

         <button
           onClick={isActive ? stopSession : startSession}
           className={`w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-base md:text-lg tracking-wider transition-all transform hover:scale-105 active:scale-95 ${
             isActive 
               ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]' 
               : 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)]'
           }`}
         >
           {isActive ? 'END CONSULTATION' : 'START CONSULTATION'}
         </button>
       </div>
    </div>
  );
};

export default LiveVoiceInterface;