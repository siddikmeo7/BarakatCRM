import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SalaryPaymentHistory from '@/components/salary/SalaryPaymentHistory';
import SalaryDueBadge from '@/components/salary/SalaryDueBadge';
import { getSalaryMethod } from '@/lib/salary';
import { getSalaryDueState, formatPayDay } from '@/lib/salaryPeriod';
import { Wallet, CalendarClock } from 'lucide-react';

const fmtMoney = (n) => (n || 0).toLocaleString('ru-RU');

// Зарплата сотрудника в разделе «Эффективность»: тип, срок, суммы и выплаты.
// Показывает, кому и за какой период была выдана зарплата (это расход на этого сотрудника).
export default function EmployeeSalaryPanel({ employee }) {
  const [payments, setPayments] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee?.id) { setLoading(false); return; }
    let alive = true;
    (async () => {
      const [pays, scheds] = await Promise.all([
        base44.entities.SalaryPayment.filter({ employee_id: employee.id }).catch(() => []),
        base44.entities.SalarySchedule.filter({ employee_id: employee.id }).catch(() => []),
      ]);
      if (!alive) return;
      setPayments([...(pays || [])].sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0)));
      setSchedule((scheds || [])[0] || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [employee?.id]);

  if (!employee?.id) return null;

  const method = getSalaryMethod(employee.salary_method || 'per_box');
  const rate = employee.salary_method === 'per_box'
    ? Number(employee.salary_per_box || 0)
    : Number(employee.salary_rate || 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const dueState = getSalaryDueState({ employee, schedule, payments });

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" /> Зарплата: тип, срок и выплаты
          </h3>
          <SalaryDueBadge state={dueState} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] text-slate-400">Тип зарплаты</p>
            <p className="text-sm font-semibold text-slate-800">{method.icon} {method.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{fmtMoney(rate)}{method.key === 'percent_revenue' ? '%' : ' с.'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] text-slate-400">Срок выплаты</p>
            <p className="text-xs font-medium text-slate-700 flex items-start gap-1.5 mt-0.5">
              <CalendarClock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>{formatPayDay(schedule)}</span>
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-[10px] text-emerald-600">Всего выплачено</p>
            <p className="text-sm font-bold text-emerald-700">{fmtMoney(totalPaid)} с.</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">{payments.length} выплат — зарплата этого сотрудника</p>
          </div>
        </div>
      </div>
      <SalaryPaymentHistory payments={payments} loading={loading} />
    </>
  );
}