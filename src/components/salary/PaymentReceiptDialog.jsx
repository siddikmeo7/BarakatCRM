import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatPaidAt } from '@/lib/salaryPeriod';
import { getSalaryMethod } from '@/lib/salary';

const fmtMoney = (n) => (Number(n) || 0).toLocaleString('ru-RU');

// Чек о выплате зарплаты: сотрудник видит, когда и сколько ему выплатили.
// Чек формируется автоматически из записи о выплате, которую создал владелец.
export default function PaymentReceiptDialog({ payment, employee, business, onClose }) {
  if (!payment) return null;

  const method = getSalaryMethod(payment.method || employee?.salary_method || 'per_box');
  const receiptNo = (payment.id || '').replace(/-/g, '').slice(-8).toUpperCase() || '—';
  const rows = [
    ['Сотрудник', employee?.name || payment.employee_name || '—'],
    ['Период', payment.period_label || payment.period_key || '—'],
    ['Способ расчёта', `${method.icon} ${method.label}`],
    ['Дата и время выплаты', formatPaidAt(payment.paid_at || payment.created_date)],
    ['Выплатил', payment.paid_by_name || business?.name || 'Владелец бизнеса'],
  ];

  return (
    <Dialog open={!!payment} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden [&>button:last-child]:hidden">
        <div className="pay-receipt bg-white dark:bg-slate-900">
          <div className="px-5 py-3 bg-[#5048e5] text-white">
            <p className="text-[10px] uppercase tracking-[.16em] font-bold opacity-80">{business?.name || 'BarakatCRM'}</p>
            <p className="text-base font-bold mt-0.5">Чек о выплате зарплаты</p>
            <p className="text-[11px] opacity-80 mt-0.5">№ {receiptNo}</p>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-[.12em] font-bold text-emerald-700 dark:text-emerald-400">Сумма выплаты</p>
                <p className="text-2xl font-bold text-emerald-600">{fmtMoney(payment.amount)} с.</p>
              </div>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 py-2">
                  <span className="text-[11px] text-slate-400 font-semibold">{label}</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white text-right">{value}</span>
                </div>
              ))}
            </div>

            {payment.note && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Примечание: {payment.note}</p>
            )}

            <p className="mt-3 text-[10px] text-slate-400 text-center">
              Чек сформирован автоматически в BarakatCRM
            </p>
          </div>
        </div>

        <div className="flex gap-2 p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 text-xs gap-1.5">
            <X className="w-3.5 h-3.5" /> Закрыть
          </Button>
          <Button onClick={() => window.print()} className="flex-1 h-9 text-xs gap-1.5 bg-[#5048e5] hover:bg-[#433bd0] text-white">
            <Printer className="w-3.5 h-3.5" /> Печать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}