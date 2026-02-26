import React from 'react';

export default function PageLoader({ message = 'Загрузка...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {/* Animated logo-style loader */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
            <path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 7V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Spinning ring around */}
        <div className="absolute inset-0 -m-2">
          <svg className="w-20 h-20 animate-spin" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="60 160" />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Skeleton bars */}
      <div className="w-64 space-y-3">
        <div className="h-3 bg-slate-200 rounded-full animate-pulse" style={{width:'80%'}}/>
        <div className="h-3 bg-slate-200 rounded-full animate-pulse" style={{width:'60%'}}/>
        <div className="h-3 bg-slate-200 rounded-full animate-pulse" style={{width:'70%'}}/>
      </div>

      <p className="text-sm text-slate-400 font-medium">{message}</p>
    </div>
  );
}