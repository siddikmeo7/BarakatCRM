import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Loader2, Sticker, Frame, Save, CheckCircle2 } from 'lucide-react';
import { PROFILE_STICKERS, PROFILE_FRAMES, getFrameWrapper } from '@/lib/profileStyle';

/**
 * Выбор стикера и рамки профиля.
 * Сохраняет на Employee (currentEmployee) или в user.data (для владельца).
 * Изменения применяются только после нажатия кнопки «Сохранить».
 * onSaved — колбэк после успешного сохранения (без аргументов).
 */
export default function ProfileStylePicker({ currentEmployee, user, onSaved }) {
  const [sticker, setSticker] = useState(currentEmployee?.profile_sticker || user?.data?.profile_sticker || 'none');
  const [frame, setFrame] = useState(currentEmployee?.profile_frame || user?.data?.profile_frame || 'none');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initialSticker = currentEmployee?.profile_sticker || user?.data?.profile_sticker || 'none';
  const initialFrame = currentEmployee?.profile_frame || user?.data?.profile_frame || 'none';
  const hasChanges = sticker !== initialSticker || frame !== initialFrame;

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      if (currentEmployee?.id) {
        await base44.entities.Employee.update(currentEmployee.id, {
          profile_sticker: sticker,
          profile_frame: frame,
        });
        if (window.__barakatEmployee) {
          window.__barakatEmployee = { ...window.__barakatEmployee, profile_sticker: sticker, profile_frame: frame };
        }
      } else {
        await base44.auth.updateMe({
          profile_sticker: sticker,
          profile_frame: frame,
        });
      }
      await onSaved?.(sticker, frame);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaving(false);
      alert('Ошибка сохранения: ' + (e?.message || e));
    }
  };

  return (
    <div className="space-y-4">
      {/* Стикеры */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sticker className="w-4 h-4 text-indigo-500" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Стикер профиля</p>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {PROFILE_STICKERS.map(s => (
            <button
              key={s.id}
              onClick={() => setSticker(s.id)}
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
        <div className="grid grid-cols-6 gap-1.5">
          {PROFILE_FRAMES.map(f => {
            const { wrapperCls, wrapperStyle } = getFrameWrapper(f.id);
            return (
              <button
                key={f.id}
                onClick={() => setFrame(f.id)}
                className={`relative aspect-square rounded-xl flex items-center justify-center border transition-all ${frame === f.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                title={f.label}
              >
                <div className={wrapperCls} style={wrapperStyle}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <span className="text-[9px]">👤</span>
                  </div>
                </div>
                {frame === f.id && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Текущая: <span className="font-medium text-slate-600 dark:text-slate-300">{PROFILE_FRAMES.find(f=>f.id===frame)?.label || 'Без рамки'}</span> · однотонные и узоры</p>
      </div>

      {/* Кнопка Сохранить */}
      <div className="pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Идёт загрузка, сохранение данных...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Сохранено
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Сохранить
            </>
          )}
        </button>
        {!hasChanges && !saving && !saved && (
          <p className="text-[11px] text-slate-400 text-center mt-1.5">Выберите стикер или рамку, чтобы сохранить</p>
        )}
      </div>
    </div>
  );
}