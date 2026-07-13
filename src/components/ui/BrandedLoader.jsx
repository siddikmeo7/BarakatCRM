import React from 'react';
import { Package } from 'lucide-react';

/**
 * Animated "BarakatCRM" branded loading screen.
 * Replaces the old lock/spinner with a branded, animated loader.
 */
export default function BrandedLoader({ message = 'Загрузка...', fullScreen = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'} bg-slate-50 dark:bg-slate-950`}>
      {/* Animated logo container */}
      <div className="relative flex items-center justify-center w-28 h-28">
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping" style={{ animationDuration: '2s' }} />
        {/* Middle pulse */}
        <div className="absolute inset-2 rounded-full bg-purple-500/10 animate-pulse" />
        {/* Spinning gradient ring */}
        <div className="absolute inset-0">
          <svg className="w-28 h-28 animate-spin" viewBox="0 0 112 112" fill="none" style={{ animationDuration: '1.5s' }}>
            <circle cx="56" cy="56" r="50" stroke="url(#barakatGrad)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="80 240" />
            <defs>
              <linearGradient id="barakatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* Logo box */}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
          <Package className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Branded text */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Barakat
          </span>
          <span className="text-slate-800 dark:text-slate-200">CRM</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">{message}</p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '120ms' }} />
        <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '240ms' }} />
      </div>
    </div>
  );
}