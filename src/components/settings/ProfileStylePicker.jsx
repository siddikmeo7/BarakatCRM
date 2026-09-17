import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Loader2, Sticker, Frame } from 'lucide-react';
import { PROFILE_STICKERS, PROFILE_FRAMES } from '@/lib/profileStyle';

/**
 * Выбор стикера и рамки профиля.
 * Сохраняет на Employee (currentEmployee) или в user.data (для владельца).
 * onSaved — колбэк после сохранения.
 */
export default function ProfileStylePicker({ currentEmployee, user, onSaved }) {
  const [sticker, setSticker] = useState(currentEmployee?.profile_sticker || user?.data?.profile_sticker || 'none');
  const [frame, setFrame] = useState(currentEmployee?.profile_frame || user?.data?.profile_frame || 'none');
  const [saving, setSaving] = useState(false);

  const persist = async (field, value) => {
    setSaving(true);
    try {
      if (currentEmployee?.id) {
        await base44.entities.Employee.update(currentEmployee.id, { [field]: value });
        if (window.__barakatEmployee) window.__barakatEmployee = { ...window.__barakatEmployee, [field]: value };
      } else {
        await base44.auth.updateMe({ [field]: value });
      }
      await onSaved?.(field, value);
    } catch (e) {
      alert('Ошибка сохранения: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const selectSticker = (id) => {
    setSticker(id);
    persist('profile_sticker', id);
  };
  const selectFrame = (id) => {
    setFrame(id);
    persist('profile_frame', id);
  };

  return (
    <div className="space-y-4">
      {/* Стикеры */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sticker className="w-4 h-4 text-indigo-500" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Стикер профиля</p>
          {saving && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {PROFILE_STICKERS.map(s => (
            <button
              key={s.id}
              onClick={() => selectSticker(s.id)}
              className={`relative aspect-square rounded-xl flex items-center justify-center text-lg border transition-all ${sticker === s.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              title={s.label}
            >
              <span>{s.emoji || '🚫'}</span>
              {sticker === s.id && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Рамки */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Frame className="w-4 h-4 text-indigo-500" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Рамка аватара</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PROFILE_FRAMES.map(f => (
            <button
              key={f.id}
              onClick={() => selectFrame(f.id)}
              className={`relative aspect-square rounded-xl flex items-center justify-center border transition-all ${frame === f.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              title={f.label}
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 ${f.ring} ${f.glow}`} />
              {frame === f.id && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Текущая: <span className="font-medium text-slate-600 dark:text-slate-300">{PROFILE_FRAMES.find(f=>f.id===frame)?.label || 'Без рамки'}</span></p>
      </div>
    </div>
  );
}