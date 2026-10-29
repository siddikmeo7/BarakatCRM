import React from 'react';
import { Building2, CheckCircle2, Clock3, Ban, Gift, CreditCard } from 'lucide-react';

const card = 'rounded-2xl border border-border bg-card p-4';

function Metric({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${tone}`} />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function SubscriptionOverview({ businesses = [], purchases = [] }) {
  const count = (status) => businesses.filter(b => (b.subscription_status || 'trial') === status).length;
  const paid = purchases.filter(p => p.status === 'paid');
  const revenue = paid.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const currencies = [...new Set(paid.map(p => p.currency).filter(Boolean))];
  const currency = currencies.length === 1 ? currencies[0] : '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <Metric label="Всего бизнесов" value={businesses.length} icon={Building2} tone="text-blue-500" />
      <Metric label="Подписка активна" value={count('active')} hint="Оплаченный доступ" icon={CheckCircle2} tone="text-emerald-500" />
      <Metric label="Пробный период" value={count('trial')} hint="Ещё не оплатили" icon={Clock3} tone="text-amber-500" />
      <Metric label="Доступ закрыт" value={count('expired') + count('blocked')} hint="Истёк или заблокирован" icon={Ban} tone="text-red-500" />
      <Metric label="Бесплатный доступ" value={count('exempt')} icon={Gift} tone="text-violet-500" />
      <Metric
        label="Оплачено всего"
        value={`${revenue.toLocaleString('ru-RU')}${currency ? ' ' + currency : ''}`}
        hint={`${paid.length} успешных платежей`}
        icon={CreditCard}
        tone="text-indigo-500"
      />
    </div>
  );
}