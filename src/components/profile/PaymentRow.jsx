import React from 'react';
import { format } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_LABELS = {
  paid: { label: 'Оплачено', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  pending: { label: 'Ожидает оплаты', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  canceled: { label: 'Отменено', cls: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
};

// Одна строка истории платежей
export default function PaymentRow({ purchase }) {
  const st = STATUS_LABELS[purchase.status] || STATUS_LABELS.pending;
  const date = purchase.paidAt || purchase.created_date;

  return (
    <div className="p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
          {purchase.productName || 'Подписка BarakatCRM'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {date ? format(new Date(date), 'dd.MM.yyyy HH:mm') : '—'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
          <CreditCard className="w-3 h-3 flex-shrink-0" />
          Способ оплаты: Base44 Payments{purchase.orderId ? ` · заказ ${purchase.orderId}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
          {purchase.amount} {purchase.currency}
        </p>
        <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold', st.cls)}>
          {st.label}
        </span>
      </div>
    </div>
  );
}