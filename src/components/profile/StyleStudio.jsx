import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Palette, ChevronDown, Check, Loader2 } from 'lucide-react';
import { APP_STYLES, applyAppStyle } from '@/lib/appStyles';
import { useAppTheme } from '@/lib/appTheme';
import { cn } from '@/lib/utils';

/**
 * Раздел «Стили» в профиле.
 * Выбранное оформление применяется ко всему приложению сразу и сохраняется
 * в аккаунте пользователя — при следующем входе стиль включится автоматически.
 */
export default function StyleStudio() {
  const { style } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const choose = async (id) => {
    if (id === style.id) return;
    applyAppStyle(id);
    setSavingId(id);
    try {
      await base44.auth.updateMe({ app_style: id });
    } catch (_) {
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
          <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">Стили оформления</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            Сейчас: {style.name} · применится сразу и сохранится для вашего входа
          </p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {APP_STYLES.map(s => {
            const active = s.id === style.id;
            return (
              <button
                key={s.id}
                onClick={() => choose(s.id)}
                className={cn(
                  'text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <div className="rounded-lg p-2 mb-2.5" style={{ background: s.colors.bg, border: `1px solid ${s.colors.line}` }}>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-9 rounded" style={{ background: s.colors.panel, border: `1px solid ${s.colors.line}` }} />
                    <span className="h-2 w-10 rounded-full" style={{ background: s.colors.text2, opacity: 0.45 }} />
                    <span className="h-4 w-4 rounded-full ml-auto" style={{ background: s.colors.accent }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: s.colors.pos }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: s.colors.neg }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                  {savingId === s.id ? (
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
                  ) : active ? (
                    <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.hint}</p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1.5">
                  {s.mode === 'dark' ? 'Тёмный' : 'Светлый'}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}