import React, { useState, useEffect } from 'react';
import { APP_NAME, LANGUAGES } from '../constants';
import { Language } from '../types';
import DharmaLogo from './DharmaLogo';
import { auth, googleProvider, saveFirebaseConfig, resetFirebaseConfig, firebaseConfig } from '../services/firebase';
import { signInWithPopup, User } from 'firebase/auth';

interface Props {
  onLogin: (type: 'guest' | 'user' | 'demo', user?: any) => void;
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthScreen: React.FC<Props> = ({ onLogin, selectedLanguage, onLanguageChange, theme, toggleTheme }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configJson, setConfigJson] = useState('');
  
  // Detect if Firebase is actually configured or using placeholders
  const isFirebaseConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_");

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      // If user forces click on Google Login without config
      setError("Firebase keys are missing. Please use Demo Mode.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin('user', result.user);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      const errorCode = err.code || '';
      
      if (errorCode === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled.");
      } else if (errorCode.includes('api-key-not-valid') || errorCode === 'auth/invalid-api-key') {
        setError("Invalid API Key. Using Demo Mode is recommended.");
      } else if (errorCode === 'auth/unauthorized-domain') {
        setError(`Domain unauthorized. Add '${window.location.hostname}' to Firebase Console.`);
      } else {
        setError("Login failed. Please try Demo Mode.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      displayName: "Demo User",
      photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dharma",
      email: "demo@dharma.ai",
      uid: "demo-123"
    };
    onLogin('demo', demoUser);
  };

  const handleGuestLogin = () => {
    onLogin('guest');
  };

  const handleSaveConfig = () => {
    try {
      const config = JSON.parse(configJson);
      saveFirebaseConfig(config);
    } catch (e) {
      setError("Invalid JSON format.");
    }
  };

  if (showConfig) {
    return (
      <div className="h-[100dvh] w-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4 text-gray-900 dark:text-white relative z-50">
        <div className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold font-serif">Setup Firebase</h2>
             <button onClick={() => setShowConfig(false)} className="text-gray-500 hover:text-black dark:hover:text-white">✕</button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-2">
             <p>Paste your Firebase Config object below:</p>
          </div>

          <textarea 
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            placeholder='{ "apiKey": "AIza...", "authDomain": "...", ... }'
            className="w-full h-32 bg-gray-50 dark:bg-black font-mono text-xs p-4 rounded-lg border border-gray-300 dark:border-neutral-700 focus:border-blue-500 focus:outline-none mb-4 text-gray-800 dark:text-gray-200"
          />

          {error && <div className="text-red-500 text-xs mb-4 text-center font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>}

          <div className="flex gap-3">
            <button 
              onClick={handleSaveConfig}
              disabled={!configJson.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Save & Reload
            </button>
            <button 
               onClick={resetFirebaseConfig}
               className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-semibold transition-colors border border-red-200 dark:border-red-900/30"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden text-gray-900 dark:text-white transition-colors duration-300">
       {/* Background */}
       <div className="absolute inset-0 bg-gray-100 dark:bg-neutral-900 opacity-50 dark:opacity-20 transition-colors">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '30px 30px', color: theme === 'dark' ? '#333' : '#ddd' }}></div>
       </div>
       
       <div className="absolute top-4 right-4 z-20">
         <button
           onClick={toggleTheme}
           className="p-2 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
         >
           {theme === 'dark' ? '☀️' : '🌙'}
         </button>
       </div>
       
       <div className="z-10 w-full max-w-md bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl relative transition-colors">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mb-4">
               <DharmaLogo className="w-full h-full object-contain drop-shadow-md dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white mb-1">{APP_NAME}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm tracking-widest">AI LEGAL COMPANION</p>
          </div>

          {/* Language Selector */}
          <div className="mb-6 bg-gray-50 dark:bg-neutral-950 p-4 rounded-xl border border-gray-200 dark:border-neutral-800 transition-colors">
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">Select Language</label>
             <div className="grid grid-cols-5 gap-2">
                {LANGUAGES.slice(0, 5).map(lang => (
                   <button 
                     key={lang}
                     onClick={() => onLanguageChange(lang)}
                     className={`text-[10px] md:text-xs py-1.5 rounded transition-colors ${selectedLanguage === lang ? 'bg-black dark:bg-white text-white dark:text-black font-bold' : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-neutral-700'}`}
                   >
                     {lang}
                   </button>
                ))}
             </div>
          </div>

          {/* Login Actions */}
          <div className="space-y-4">
            
            {error && !showConfig && (
               <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg text-center border border-red-100 dark:border-red-900/30 break-words font-semibold">
                 {error}
               </div>
            )}

            {/* Smart Button Logic: If no config, Show Demo as Primary. If config, Show Google as Primary. */}
            
            {!isFirebaseConfigured ? (
              <>
                 <button 
                  onClick={handleDemoLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2 group animate-pulse"
                >
                   <span>Start Free Demo</span>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                   </svg>
                </button>
                <div className="text-center">
                   <p className="text-[10px] text-gray-400 mb-1">Developer?</p>
                   <button 
                      onClick={() => setShowConfig(true)}
                      className="text-[10px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline"
                   >
                      Setup Firebase Keys
                   </button>
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white dark:bg-white text-gray-700 dark:text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 flex items-center justify-center gap-3 shadow-sm"
                >
                  {loading ? (
                     <span className="text-sm">Connecting...</span>
                  ) : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                
                <div className="relative my-4">
                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-neutral-800"></div></div>
                   <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-neutral-900 px-2 text-gray-500 font-bold">Or</span></div>
                </div>

                <button 
                  onClick={handleDemoLogin}
                  className="w-full bg-transparent text-gray-600 dark:text-gray-300 font-semibold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 border border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500 transition-all flex items-center justify-center gap-2 group"
                >
                   <span>Try Demo Mode</span>
                </button>
              </>
            )}

          </div>
       </div>

       {/* Legal Disclaimer Footer */}
       <div className="absolute bottom-2 left-0 right-0 text-center p-2 z-20 pointer-events-none">
          <p className="text-[10px] text-gray-400 dark:text-gray-600 max-w-md mx-auto leading-tight bg-white/50 dark:bg-black/50 p-1 rounded backdrop-blur-sm">
             <strong>Disclaimer:</strong> {APP_NAME} is an AI research prototype. It does not provide binding legal advice. Use at your own risk.
          </p>
       </div>
    </div>
  );
};
export default AuthScreen;