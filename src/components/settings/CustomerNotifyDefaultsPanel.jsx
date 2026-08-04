import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, Mail, Loader2, CheckCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, soft: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
  { key: 'telegram', label: 'Telegram', icon: Send, soft: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { key: 'email', label: 'Email', icon: Mail, soft: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' }
];

export default function CustomerNotifyDefaultsPanel({ business, onUpdate }) {
  const [channels, setChannels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const def = business?.default_notify_channels;
    setChannels(Array.isArray(def) ? def : (def ? [def] : ['whatsapp']));
  }, [business?.id, business?.default_notify_channels]);

  const toggle = (key) => {
    setChannels(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      await base44.entities.Business.update(business.id, { default_notify_channels: channels });
      const updated = { ...business, default_notify_channels: channels };
      if (onUpdate) onUpdate(updated);
      window.__barakatBusiness = updated;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Error saving notify defaults:', e);
      alert('Ошибка сохранения: ' + (e?.message || 'неизвестная'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Уведомления клиентам о покупках</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Каналы по умолчанию при продаже (можно менять в окне продажи)</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map(ch => {
          const active = channels.includes(ch.key);
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => toggle(ch.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 transition-all text-xs font-medium",
                active ? cn(ch.soft, "border-transparent") : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <ch.icon className="w-4 h-4" />
              {ch.label}
              {active && <span className="text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        ⚠️ Email и Telegram клиентам открываются как готовое сообщение (mailto / t.me). Полностью автоматическая отправка на email и авто-напоминание в срок долга требуют подключения провайдера — скажите, чтобы настроить.
      </p>
      <Button onClick={handleSave} disabled={saving} size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
        {saving ? 'Сохранение...' : saved ? 'Сохранено' : 'Сохранить по умолчанию'}
      </Button>
    </div>
  );
}