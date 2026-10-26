import React from 'react';
import { base44 } from '@/api/base44Client';
import { Moon, Sun } from 'lucide-react';
import { switchStyleMode, initAppStyle } from '@/lib/appStyles';
import { useAppTheme } from '@/lib/appTheme';

/** Совместимость: применяет сохранённое оформление */
export function applyTheme() {
  initAppStyle();
}

/**
 * Быстрое переключение тёмного и светлого оформления.
 * Полный выбор стиля — в профиле, раздел «Стили оформления».
 */
export default function DarkModeToggle({ className = '' }) {
  const { isDark, styleName } = useAppTheme();

  const toggle = () => {
    const next = switchStyleMode(isDark ? 'light' : 'dark');
    base44.auth.updateMe({ app_style: next.id }).catch(() => {});
  };

  return (
    <button
      onClick={toggle}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isDark
          ? <Moon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          : <Sun className="w-5 h-5 text-amber-500 flex-shrink-0" />
        }
        <span className="font-medium text-sm truncate">
          {isDark ? 'Тёмное оформление' : 'Светлое оформление'}
        </span>
        <span className="text-xs text-slate-400 truncate hidden sm:inline">· {styleName}</span>
      </div>
      <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 flex-shrink-0 ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}