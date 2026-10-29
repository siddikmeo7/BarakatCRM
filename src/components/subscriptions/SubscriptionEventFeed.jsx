import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const EVENT_LABELS = {
  trial_started: { label: 'Пробный период начат', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  activated: { label: 'Подписка оплачена', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  renewed: { label: 'Подписка продлена', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  canceled: { label: 'Подписка отменена', tone: 'bg-red-50 text-red-700 border-red-200' },
  expired: { label: 'Подписка истекла', tone: 'bg-red-50 text-red-700 border-red-200' },
  exempt: { label: 'Бесплатный доступ', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  blocked: { label: 'Доступ закрыт', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  restored: { label: 'Доступ восстановлен', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export default function SubscriptionEventFeed({ events = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">История подписок</p>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Пока нет событий</p>
      ) : (
        <ul className="divide-y divide-border max-h-[420px] overflow-y-auto custom-scroll">
          {events.map(e => {
            const meta = EVENT_LABELS[e.event_type] || { label: e.event_type, tone: 'bg-slate-100 text-slate-700 border-slate-200' };
            return (
              <li key={e.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold ${meta.tone}`}>
                      {meta.label}
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate">{e.business_name || 'Бизнес'}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.note || (e.actor_name || e.actor_email || 'Система')}
                    {typeof e.amount === 'number' && e.amount > 0 ? ` · ${e.amount} ${e.currency || ''}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {e.occurred_at ? format(new Date(e.occurred_at), 'dd MMM yyyy, HH:mm', { locale: ru }) : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}