import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export function applyTheme() {
  const saved = localStorage.getItem('barakatcrm_theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export default function DarkModeToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('barakatcrm_theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  return (
    <button
      onClick={toggle}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
        isDark
          ? 'bg-slate-800 border-slate-600 text-white'
          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {isDark
          ? <Moon className="w-5 h-5 text-indigo-400" />
          : <Sun className="w-5 h-5 text-amber-500" />
        }
        <span className="font-medium text-sm">
          {isDark ? 'Тёмная тема включена' : 'Светлая тема включена'}
        </span>
      </div>
      <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}