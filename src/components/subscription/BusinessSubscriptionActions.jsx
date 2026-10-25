import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Gift, CalendarPlus, Ban } from 'lucide-react';
import { TRIAL_DAYS } from '@/lib/subscription';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const DAY_MS = 24 * 60 * 60 * 1000;

// Управление доступом конкретного бизнеса: платит / бесплатно / продление / закрытие
export default function BusinessSubscriptionActions({ business, onUpdated }) {
  const [busy, setBusy] = useState('');

  const apply = async (key, patch) => {
    setBusy(key);
    try {
      await base44.entities.Business.update(business.id, patch);
      await onUpdated?.();
    } finally {
      setBusy('');
    }
  };

  const now = new Date().toISOString();

  const actions = [
    {
      key: 'active',
      label: 'Подписка оплачена',
      icon: CheckCircle2,
      tone: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
      run: () => apply('active', { subscription_status: 'active', subscription_started_at: now, subscription_note: 'Активировано администратором' }),
    },
    {
      key: 'exempt',
      label: 'Работает бесплатно',
      icon: Gift,
      tone: 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
      run: () => apply('exempt', { subscription_status: 'exempt', subscription_note: 'Бесплатный доступ — решение владельца системы' }),
    },
    {
      key: 'trial',
      label: `Продлить пробный на ${TRIAL_DAYS} дн.`,
      icon: CalendarPlus,
      tone: 'text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20',
      run: () => apply('trial', {
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString(),
        subscription_note: 'Пробный период продлён администратором',
      }),
    },
    {
      key: 'blocked',
      label: 'Закрыть доступ',
      icon: Ban,
      tone: 'text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20',
      run: () => apply('blocked', { subscription_status: 'blocked', subscription_note: 'Доступ закрыт администратором' }),
    },
  ];

  const visible = business.subscription_status === 'blocked' ? actions.filter(a => a.key !== 'blocked') : actions;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-bold uppercase tracking-[.12em] text-[10.5px]">Подписка</span>
        {business.trial_ends_at && (
          <span>Пробный до {format(new Date(business.trial_ends_at), 'dd MMM yyyy', { locale: ru })}</span>
        )}
        {business.subscription_started_at && (
          <span>Оплачено {format(new Date(business.subscription_started_at), 'dd MMM yyyy', { locale: ru })}</span>
        )}
      </div>

      {business.subscription_note && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{business.subscription_note}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map(a => (
          <Button
            key={a.key}
            variant="outline"
            onClick={a.run}
            disabled={!!busy}
            className={`justify-start gap-2 rounded-xl ${a.tone}`}
          >
            {busy === a.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <a.icon className="w-4 h-4" />}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}