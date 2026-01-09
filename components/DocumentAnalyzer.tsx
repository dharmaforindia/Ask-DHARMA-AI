import React, { useState, useRef, useEffect } from 'react';
import { analyzeLegalDocument } from '../services/geminiService';

const DocumentAnalyzer: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [userPrompt, setUserPrompt] = useState<string>("");

  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results on mobile when analysis completes
  useEffect(() => {
    if (!loading && analysis && resultRef.current && window.innerWidth < 1024) {
      // Small delay to ensure render
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [analysis, loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64); 
        setAnalysis(""); // Clear previous analysis
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setAnalysis("");
    
    // Remove "data:image/xyz;base64," prefix
    const base64Data = image.split(',')[1];
    
    // Use user prompt or default
    const prompt = userPrompt.trim() || "Identify the type of legal document, key clauses, and any potential red flags.";
    
    const result = await analyzeLegalDocument(base64Data, mimeType, prompt);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 md:p-6 overflow-y-auto transition-colors duration-300">
      <h2 className="text-xl md:text-2xl font-serif mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-neutral-800 pb-4 shrink-0">Document Analysis</h2>
      
      {/* 
         Mobile: Stacked with auto height. 
         Desktop: 2 columns with full height matching the parent. 
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 h-auto lg:h-full">
        
        {/* Upload Section */}
        <div className="flex flex-col gap-4 shrink-0">
          <div className="min-h-[250px] md:min-h-[300px] lg:flex-1 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl flex items-center justify-center relative bg-gray-50 dark:bg-neutral-950 hover:border-black dark:hover:border-white transition-colors">
            {image ? (
               mimeType === 'application/pdf' ? (
                  <div className="flex flex-col items-center p-6 text-red-500">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-2">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                     </svg>
                     <p className="font-bold">PDF Document Selected</p>
                  </div>
               ) : (
                  <img src={image} alt="Preview" className="max-h-[300px] lg:max-h-full max-w-full object-contain p-2" />
               )
            ) : (
              <div className="text-center p-6">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Upload Contract, Affidavit, or Notice</p>
                <p className="text-xs text-gray-400 mt-2">Supports JPG, PNG, PDF</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Specific Query (Optional)</label>
            <textarea 
               value={userPrompt}
               onChange={(e) => setUserPrompt(e.target.value)}
               placeholder="E.g., Does this contract have a termination clause? Is the stamp duty correct?"
               className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-neutral-700 rounded-lg p-3 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none h-20 text-gray-900 dark:text-white"
            />
          </div>
          
          <button
            onClick={handleAnalyze}
            disabled={!image || loading}
            className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "ANALYZING..." : "ANALYZE DOCUMENT"}
          </button>
        </div>

        {/* Result Section */}
        {/* On mobile: min height ensures it is visible. On Desktop: flex-1 to fill column */}
        <div 
          ref={resultRef}
          className="bg-gray-100 dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700 overflow-y-auto transition-colors flex flex-col min-h-[400px] lg:min-h-0 lg:h-full"
        >
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-center shrink-0">
             <span>Analysis Report</span>
             {analysis && (
               <button 
                 onClick={() => navigator.clipboard.writeText(analysis)}
                 className="text-xs text-blue-500 hover:text-blue-400"
               >
                 Copy Text
               </button>
             )}
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
               <div className="space-y-4 animate-pulse pt-4">
                 <div className="h-4 bg-gray-300 dark:bg-neutral-700 rounded w-3/4"></div>
                 <div className="h-4 bg-gray-300 dark:bg-neutral-700 rounded w-1/2"></div>
                 <div className="h-4 bg-gray-300 dark:bg-neutral-700 rounded w-full"></div>
                 <div className="h-4 bg-gray-300 dark:bg-neutral-700 rounded w-5/6"></div>
                 <div className="h-4 bg-gray-300 dark:bg-neutral-700 rounded w-full"></div>
               </div>
            ) : analysis ? (
              <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 text-sm leading-relaxed pb-4">
                   {analysis}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 opacity-60">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                 </svg>
                 <p className="text-sm">Analysis results will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalyzer;