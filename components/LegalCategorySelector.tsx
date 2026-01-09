import React, { useState } from 'react';
import { LEGAL_CATEGORIES } from '../constants';
import { LegalCategory, ChatSession, RetentionPeriod } from '../types';

interface Props {
  // Category Mode Props
  selectedCategoryId: string | null;
  onSelectCategory: (category: LegalCategory) => void;

  // History Mode Props
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onClearHistory: () => void;
  
  // Settings
  retentionPeriod: RetentionPeriod;
  onRetentionChange: (period: RetentionPeriod) => void;
}

const LegalCategorySelector: React.FC<Props> = ({ 
  selectedCategoryId, 
  onSelectCategory,
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onClearHistory,
  retentionPeriod,
  onRetentionChange
}) => {
  const [activeTab, setActiveTab] = useState<'jurisdictions' | 'history'>('jurisdictions');

  // Helper to format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-neutral-800 mb-2 shrink-0 transition-colors">
        <button
          onClick={() => setActiveTab('jurisdictions')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'jurisdictions' 
              ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
          }`}
        >
          Jurisdictions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'history' 
              ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        
        {/* --- JURISDICTIONS TAB --- */}
        {activeTab === 'jurisdictions' && (
          <div className="space-y-2 pb-4">
            {LEGAL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                className={`w-full text-left p-2.5 md:p-3 rounded-lg border transition-all duration-200 group ${
                  selectedCategoryId === cat.id
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md'
                    : 'bg-white dark:bg-neutral-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-neutral-800 hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{cat.name}</p>
                    <p className={`text-xs truncate ${selectedCategoryId === cat.id ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-600'}`}>
                      {cat.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === 'history' && (
          <div className="flex flex-col h-full">
            {/* New Chat Button */}
            <button
              onClick={onCreateSession}
              className="w-full mb-4 bg-gray-200 hover:bg-gray-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white p-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-300 dark:border-neutral-700 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="font-bold text-sm">New Consultation</span>
            </button>

            {/* Retention Settings */}
            <div className="mb-4 px-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">
                History Retention
              </label>
              <div className="relative">
                <select
                  value={retentionPeriod}
                  onChange={(e) => onRetentionChange(e.target.value as RetentionPeriod)}
                  className="w-full bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-300 text-xs p-2 rounded border border-gray-200 dark:border-neutral-800 focus:border-gray-500 dark:focus:border-neutral-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                >
                  <option value="7d">Save for 7 Days</option>
                  <option value="30d">Save for 30 Days</option>
                  <option value="none">No Save (Incognito)</option>
                </select>
                <div className="absolute right-2 top-2 pointer-events-none text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Session List */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              <h3 className="text-xs text-gray-500 font-bold uppercase tracking-widest px-1 mb-1">Recent</h3>
              
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-600 text-xs italic">
                  No saved history.
                </div>
              ) : (
                sessions.slice().reverse().map(session => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`w-full group relative text-left p-2.5 md:p-3 rounded-lg border transition-all ${
                      currentSessionId === session.id
                        ? 'bg-gray-200 dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 text-black dark:text-white shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-neutral-900 hover:border-gray-200 dark:hover:border-neutral-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="pr-6">
                      <p className="font-medium text-sm truncate">{session.title || 'New Conversation'}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-600 mt-1 flex justify-between">
                         <span>{formatDate(session.timestamp)}</span>
                         {session.category && <span>{session.category.name}</span>}
                      </p>
                    </div>
                    
                    {/* Delete Action */}
                    <div 
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-neutral-950 rounded transition-all"
                      title="Delete Chat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Clear All Button */}
            {sessions.length > 0 && (
              <button 
                onClick={() => {
                   if (window.confirm("Are you sure you want to delete all chat history?")) {
                      onClearHistory();
                   }
                }}
                className="mt-4 text-xs text-red-600 dark:text-red-900 hover:text-red-800 dark:hover:text-red-500 text-center py-2 w-full transition-colors font-semibold"
              >
                Clear All History
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalCategorySelector;