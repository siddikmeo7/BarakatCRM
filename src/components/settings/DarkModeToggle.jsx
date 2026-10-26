import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAppTheme, applyThemeMode } from '@/lib/appTheme';

/**
 * Кнопка смены интерфейса системы: тёмное ↔ светлое оформление.
 * Выбор применяется сразу ко всем разделам и сохраняется в браузере.
 */
export default function DarkModeToggle({ className = '' }) {
  const { isDark } = useAppTheme();

  const toggle = () => {
    applyThemeMode(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggle}
      className={`w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3 text-left transition-colors hover:border-indigo-300 dark:hover:border-indigo-700 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
        {isDark
          ? <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          : <Sun className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white">Изменить интерфейс системы</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Сейчас: {isDark ? 'тёмное оформление' : 'светлое оформление'} · нажмите, чтобы поменять
        </p>
      </div>
      <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 flex-shrink-0 ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}