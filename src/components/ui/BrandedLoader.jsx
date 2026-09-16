import React, { useState, useEffect } from 'react';
import { Package, RefreshCw } from 'lucide-react';

/**
 * Animated "BarakatCRM" branded loading screen.
 * Отслеживает время загрузки и показывает прогресс-сообщения:
 *  — 6–9с: «Загрузка занимает чуть больше времени, подождите…»
 *  — 10с+: «Загрузка затянулась» + кнопка перезагрузки
 * Также поддерживает firstTime — сообщение для первого входа.
 */
export default function BrandedLoader({ message = 'Загрузка...', fullScreen = false, firstTime = false, timed = true }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const slow = elapsed >= 6 && elapsed < 10;
  const stuck = elapsed >= 10;

  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'} bg-slate-50 dark:bg-slate-950 px-4`}>
      <div className="relative flex items-center justify-center w-28 h-28">
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full bg-purple-500/10 animate-pulse" />
        <div className="absolute inset-0">
          <svg className="w-28 h-28 animate-spin" viewBox="0 0 112 112" fill="none" style={{ animationDuration: stuck ? '0.8s' : '1.5s' }}>
            <circle cx="56" cy="56" r="50" stroke="url(#barakatGrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="80 240" />
            <defs>
              <linearGradient id="barakatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
          <Package className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">Barakat</span>
          <span className="text-slate-800 dark:text-slate-200">CRM</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">{message}</p>

        {timed && firstTime && !slow && !stuck && (
          <p className="text-xs text-indigo-500 mt-2 font-medium">Вы впервые вошли — нужно немного времени, чтобы загрузить данные. Пожалуйста, подождите 🙏</p>
        )}

        {timed && slow && (
          <p className="text-xs text-amber-500 mt-2 font-medium">Загрузка занимает чуть больше времени, чем обычно. Пожалуйста, подождите — скоро всё откроется ⏳</p>
        )}

        {timed && stuck && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-red-500 font-medium">Похоже, загрузка затянулась. Проверьте соединение или обновите страницу.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Обновить страницу
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '120ms' }} />
        <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '240ms' }} />
      </div>

      {timed && elapsed > 3 && (
        <p className="text-[10px] text-slate-300 dark:text-slate-600 -mt-3">{elapsed} сек</p>
      )}
    </div>
  );
}