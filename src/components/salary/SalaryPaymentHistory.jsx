import React from 'react';
import { History } from 'lucide-react';
import { formatPaidAt } from '@/lib/salaryPeriod';
import { getSalaryMethod } from '@/lib/salary';

const fmtMoney = (n) => (n || 0).toLocaleString('ru-RU');

export default function SalaryPaymentHistory({ payments = [], loading }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-emerald-600" />
        <p className="text-sm font-semibold text-foreground">История выплат</p>
        <span className="ml-auto text-xs text-muted-foreground">{payments.length}</span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Загрузка...</p>
      ) : payments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Выплат ещё не было</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll pr-1">
          {payments.map(p => (
            <div key={p.id} className="rounded-xl border border-border bg-muted/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-600">{fmtMoney(p.amount)} с.</span>
                <span className="text-[11px] text-muted-foreground">{formatPaidAt(p.paid_at)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground flex-wrap">
                <span>{getSalaryMethod(p.method).icon} {getSalaryMethod(p.method).label}</span>
                {p.period_label && (
                  <span className="text-foreground font-semibold">
                    · Зарплата за {p.method === 'fixed_monthly' ? `месяц ${p.period_label}` : p.period_label}
                  </span>
                )}
              </div>
              {p.note && <p className="text-[11px] text-muted-foreground mt-1">{p.note}</p>}
              {p.paid_by_name && <p className="text-[11px] text-muted-foreground mt-1">Выплатил: {p.paid_by_name}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}