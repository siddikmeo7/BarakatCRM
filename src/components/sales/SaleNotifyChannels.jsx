import React from 'react';
import { MessageCircle, Send, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, active: 'bg-green-500', soft: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
  { key: 'telegram', label: 'Telegram', icon: Send, active: 'bg-blue-500', soft: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { key: 'email', label: 'Email', icon: Mail, active: 'bg-rose-500', soft: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' }
];

function channelAvailable(ch, customer) {
  if (ch.key === 'whatsapp') {
    return !!((customer?.use_phone_for_all ? customer?.phone : (customer?.whatsapp || customer?.phone)));
  }
  if (ch.key === 'email') return !!(customer?.email);
  if (ch.key === 'telegram') {
    const u = String((customer?.use_phone_for_all ? customer?.phone : customer?.telegram) || '').trim().replace(/^@/, '');
    return !!u && !/^\d+$/.test(u);
  }
  return false;
}

export default function SaleNotifyChannels({ channels, onChange, customer }) {
  const toggle = (key, available) => {
    if (!available) return; // нельзя включить недоступный канал
    if (channels.includes(key)) onChange(channels.filter(k => k !== key));
    else onChange([...channels, key]);
  };

  return (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Отправить сообщение клиенту</p>
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map(ch => {
          const active = channels.includes(ch.key);
          const available = channelAvailable(ch, customer);
          return (
            <button
              key={ch.key}
              type="button"
              disabled={!available}
              onClick={() => toggle(ch.key, available)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg border-2 transition-all text-xs font-medium",
                active ? cn(ch.soft, "border-transparent ring-2 ring-offset-0") : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50",
                !available && "opacity-40 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <ch.icon className="w-4 h-4" />
              {ch.label}
              {active && <span className="text-[10px]">✓</span>}
              {!available && <span className="text-[9px] text-slate-400">нет данных</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        WhatsApp/Telegram открывают чат — вы подтверждаете отправку. Email открывает почтовое приложение.
      </p>
    </div>
  );
}