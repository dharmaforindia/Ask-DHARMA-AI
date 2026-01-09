import React, { useState, useEffect } from 'react';
import { APP_NAME, LANGUAGES } from './constants';
import { AppMode, LegalCategory, Language, ChatSession, RetentionPeriod, Sender, Message } from './types';
import LegalCategorySelector from './components/LegalCategorySelector';
import ChatInterface from './components/ChatInterface';
import DocumentAnalyzer from './components/DocumentAnalyzer';
import LiveVoiceInterface from './components/LiveVoiceInterface';
import AuthScreen from './components/AuthScreen';
import DharmaLogo from './components/DharmaLogo';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<'guest' | 'user' | 'demo' | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('English');
  
  const [mode, setMode] = useState<AppMode>(AppMode.Chat);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialize Theme
  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('dharma_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('dark'); // Default to dark as per original design
    }
  }, []);

  // Listen for Firebase Auth State Changes
  useEffect(() => {
    if (!auth) return;
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Valid Firebase User (Google Login)
        setIsLoggedIn(true);
        setUserType('user');
        setUserName(user.displayName || 'User');
        setUserPhoto(user.photoURL);
      } else {
        // No Firebase User
        // If we were previously logged in as a 'user', we should log out.
        // If we are currently 'demo' or 'guest', we stay logged in locally.
        setUserType(prevType => {
           if (prevType === 'user') {
              setIsLoggedIn(false);
              setUserName('');
              setUserPhoto(null);
              return null;
           }
           return prevType;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dharma_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // --- Session & History Management ---
  const [retentionPeriod, setRetentionPeriod] = useState<RetentionPeriod>(() => {
    if (typeof window !== 'undefined') {
       return (localStorage.getItem('dharma_retention') as RetentionPeriod) || '30d';
    }
    return '30d';
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('dharma_sessions');
       if (saved) {
         try {
           return JSON.parse(saved);
         } catch(e) {
           console.error("Failed to parse sessions", e);
         }
       }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Helper to create a welcome message
  const createWelcomeMessage = (name: string): Message => ({
      id: 'welcome',
      text: `${name !== 'Guest' ? `Namaste ${name}.` : 'Namaste.'} Welcome to Ask DHARMA.\n\nAn initiative by K N Tharun Kumar, powered by the DHARMA TRUST, committed to providing free legal aid and making justice accessible to all.\n\nI am your dedicated AI Legal Companion. Select a jurisdiction or start typing to begin.`,
      sender: Sender.Bot,
      timestamp: Date.now()
  });

  // Helper to create category specific introduction
  const createCategoryIntroMessage = (category: LegalCategory): Message => {
     let text = `I see you are interested in ${category.name}. How can I assist you with ${category.description}?`;
     
     if (category.id === 'ai_prot') {
        text = `I specialize in Intellectual Property protection for AI & Software in India. 

Based on current Indian IP standards, I can guide you on:
Copyright for Source Code (Easy difficulty)
Trade Secrets for Model Weights (Moderate difficulty)
Patents for Unique Algorithms (High difficulty, requires technical effect)
Database Rights for Training Datasets (Moderate difficulty)

How can I assist you today?`;
     }

     return {
        id: (Date.now() + 1).toString(),
        text: text,
        sender: Sender.Bot,
        timestamp: Date.now()
     };
  };

  // Create new session logic
  const createNewSession = (category: LegalCategory | null = null) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: category ? `${category.name} Consultation` : 'New Chat',
      timestamp: Date.now(),
      category: category,
      messages: [createWelcomeMessage(userName)]
    };
    
    // Add context message if category selected
    if (category) {
       newSession.messages.push(createCategoryIntroMessage(category));
    }

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
  };

  // Initialize first session if none
  useEffect(() => {
    if (isLoggedIn && sessions.length === 0 && !currentSessionId) {
      createNewSession();
    } else if (isLoggedIn && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[sessions.length - 1].id);
    }
  }, [isLoggedIn, sessions.length]);

  // Persist Retention
  useEffect(() => {
    localStorage.setItem('dharma_retention', retentionPeriod);
  }, [retentionPeriod]);

  // Cleanup & Persist Sessions based on Retention
  useEffect(() => {
    if (retentionPeriod === 'none') {
       // If no save, we don't save to localStorage, but we keep in memory
       localStorage.removeItem('dharma_sessions');
       return;
    }

    const now = Date.now();
    const daysInMillis = 1000 * 60 * 60 * 24;
    const limit = retentionPeriod === '7d' ? 7 : 30;
    
    // Filter expired sessions
    const validSessions = sessions.filter(s => {
      const ageDays = (now - s.timestamp) / daysInMillis;
      return ageDays <= limit;
    });

    localStorage.setItem('dharma_sessions', JSON.stringify(validSessions));
  }, [sessions, retentionPeriod]);


  // Session Handlers
  const handleLogin = (type: 'guest' | 'user' | 'demo', user?: any) => {
    setUserType(type);
    
    if (type === 'user' && user) {
       setUserName(user.displayName || 'User');
       setUserPhoto(user.photoURL);
    } else if (type === 'demo') {
       setUserName(user.displayName || 'Demo User');
       setUserPhoto(user.photoURL);
    } else {
       setUserName('Guest');
       setUserPhoto(null);
    }
    
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    if (auth && userType === 'user') {
      try {
        await signOut(auth);
      } catch (error) {
        // console.error("Logout Error", error);
      }
    }
    
    // Reset local state
    setIsLoggedIn(false);
    setUserType(null);
    setUserName('');
    setUserPhoto(null);
    setSessions([]); // Clear local session state on logout
    setCurrentSessionId(null);
  };

  const handleCategorySelect = (category: LegalCategory) => {
    // Check if current session is empty (only welcome msg)
    const current = sessions.find(s => s.id === currentSessionId);
    const isClean = current && current.messages.length <= 1;

    if (isClean && current) {
      // Update current session context
      const updatedSession = {
        ...current,
        category: category,
        title: `${category.name} Consultation`,
        messages: [
          createWelcomeMessage(userName),
          createCategoryIntroMessage(category)
        ]
      };
      setSessions(prev => prev.map(s => s.id === current.id ? updatedSession : s));
    } else {
      // Start new session
      createNewSession(category);
    }
    
    setMode(AppMode.Chat);
    setIsMobileMenuOpen(false);
  };

  const handleUpdateSession = (updatedSession: ChatSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      // If we deleted active session, switch to last one or create new
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[newSessions.length - 1].id);
      } else {
        createNewSession(); // will set current ID inside
      }
    }
  };

  const handleClearHistory = () => {
    setSessions([]);
    createNewSession();
  };

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId) || sessions[0];


  const renderContent = () => {
    const activeSession = getCurrentSession();

    switch (mode) {
      case AppMode.Chat:
        return activeSession ? (
          <ChatInterface 
            session={activeSession} 
            onUpdateSession={handleUpdateSession}
            language={language} 
            userName={userName} 
          />
        ) : <div className="text-gray-900 dark:text-white">Loading...</div>;
      case AppMode.Live:
        return <LiveVoiceInterface language={language} />;
      case AppMode.Analyze:
        return <DocumentAnalyzer />;
      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
        selectedLanguage={language} 
        onLanguageChange={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="h-14 md:h-16 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between px-2 md:px-6 bg-white dark:bg-neutral-950 z-20 shrink-0 transition-colors duration-300">
        
        {/* Left Side: Menu + Logo */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 min-w-0">
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-1.5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Open Jurisdictions Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0">
            <DharmaLogo className="w-full h-full object-contain" />
          </div>
          <h1 className="text-base md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate hidden md:block">{APP_NAME}</h1>
        </div>
        
        {/* Right Side: Controls */}
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar ml-auto pl-2">
           
           {/* Theme Toggle */}
           <button
             onClick={toggleTheme}
             className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
             title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
           >
             {theme === 'dark' ? (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
               </svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
               </svg>
             )}
           </button>

           {/* Language Dropdown (Small) */}
           <div className="relative group shrink-0">
              <select 
                 value={language} 
                 onChange={(e) => setLanguage(e.target.value as Language)}
                 className="bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-white text-[10px] md:text-xs py-1 px-1 md:px-2 rounded border border-gray-200 dark:border-neutral-700 focus:outline-none cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 w-[55px] md:w-auto transition-colors"
              >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang.substring(0,3)}</option>
                  ))}
              </select>
           </div>

           {/* Nav Buttons */}
           <nav className="flex gap-1 bg-gray-100 dark:bg-neutral-900 p-0.5 md:p-1 rounded-lg border border-gray-200 dark:border-neutral-800 shrink-0 transition-colors">
            <button 
              onClick={() => setMode(AppMode.Chat)}
              className={`px-2 md:px-3 py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${mode === AppMode.Chat ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-neutral-700' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
            >
              Chat
            </button>
            <button 
              onClick={() => setMode(AppMode.Live)}
              className={`px-2 md:px-3 py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${mode === AppMode.Live ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-neutral-700' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
            >
              Voice
            </button>
            <button 
              onClick={() => setMode(AppMode.Analyze)}
              className={`px-2 md:px-3 py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${mode === AppMode.Analyze ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-neutral-700' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
            >
              Scan
            </button>
          </nav>

          <div className="flex items-center gap-2">
             {userPhoto && (
               <img src={userPhoto} alt="User" className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 hidden sm:block" />
             )}
             <button 
                onClick={handleLogout}
                className="text-xs text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 font-bold ml-1 hidden sm:block shrink-0"
             >
                LOGOUT
             </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className={`w-80 border-r border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-black hidden md:block p-4 transition-colors duration-300 ${mode !== AppMode.Chat ? 'hidden' : ''}`}>
           <LegalCategorySelector 
             selectedCategoryId={getCurrentSession()?.category?.id || null}
             onSelectCategory={handleCategorySelect}
             
             sessions={sessions}
             currentSessionId={currentSessionId}
             onSelectSession={(id) => setCurrentSessionId(id)}
             onCreateSession={() => createNewSession()}
             onDeleteSession={handleDeleteSession}
             onClearHistory={handleClearHistory}
             
             retentionPeriod={retentionPeriod}
             onRetentionChange={setRetentionPeriod}
           />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            
            {/* Drawer */}
            <div className="relative w-[85%] max-w-sm bg-white dark:bg-neutral-900 h-full border-r border-gray-200 dark:border-neutral-800 shadow-2xl flex flex-col p-4 animate-[slideIn_0.3s_ease-out] transition-colors duration-300">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6">
                      <DharmaLogo className="w-full h-full object-contain" />
                   </div>
                   <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">{APP_NAME}</h2>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <LegalCategorySelector 
                   selectedCategoryId={getCurrentSession()?.category?.id || null}
                   onSelectCategory={handleCategorySelect}
                   
                   sessions={sessions}
                   currentSessionId={currentSessionId}
                   onSelectSession={(id) => { setCurrentSessionId(id); setIsMobileMenuOpen(false); }}
                   onCreateSession={() => { createNewSession(); setIsMobileMenuOpen(false); }}
                   onDeleteSession={handleDeleteSession}
                   onClearHistory={handleClearHistory}
                   
                   retentionPeriod={retentionPeriod}
                   onRetentionChange={setRetentionPeriod}
                />
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800">
                <div className="flex items-center gap-3 mb-4">
                   {userPhoto ? (
                      <img src={userPhoto} alt="Profile" className="w-10 h-10 rounded-full border border-gray-300 dark:border-neutral-600" />
                   ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center text-lg">
                         {userName.charAt(0)}
                      </div>
                   )}
                   <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">Logged in as</div>
                      <div className="text-gray-900 dark:text-white font-bold truncate">{userName}</div>
                   </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold border border-red-200 dark:border-red-900/50"
                >
                   Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-0 md:p-4 bg-gray-50 dark:bg-black relative flex flex-col min-w-0 transition-colors duration-300">
          {renderContent()}
        </main>
      </div>
      
      {/* Footer Info - Always Visible */}
      <footer className="bg-white dark:bg-black py-2 px-3 border-t border-gray-200 dark:border-neutral-900 text-center text-[10px] text-gray-500 dark:text-neutral-600 shrink-0 transition-colors duration-300 z-10">
        <p className="opacity-80 leading-tight">
          <strong>LEGAL DISCLAIMER:</strong> {APP_NAME} is an AI tool for informational purposes only and <u>not</u> a substitute for professional legal advice. Responses may be inaccurate. Always consult a qualified lawyer.
        </p>
      </footer>
    </div>
  );
};

export default App;