import React from 'react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { UserCircle, Receipt } from 'lucide-react';

const fmtMoney = (n) => (Number(n) || 0).toLocaleString('ru-RU');

// Профиль сотрудника в разделе «Расходы»: он видит, что работает со своими
// расходами и сколько он потратил за выбранный период.
export default function EmployeeExpensesProfile({ employee, total = 0, count = 0, businessName }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_4px_16px_rgba(15,23,42,.06)] px-4 py-3 flex items-center gap-3">
      <EmployeeAvatar employee={employee} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[.14em] font-bold text-slate-400">Мой профиль</p>
        <p className="font-bold text-slate-900 dark:text-white truncate">{employee?.name || 'Сотрудник'}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {businessName ? `${businessName} · ` : ''}сотрудник
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400 flex items-center gap-1 justify-end">
          <Receipt className="w-3 h-3" /> Мои расходы
        </p>
        <p className="text-lg font-bold text-red-600 leading-tight">−{fmtMoney(total)} с.</p>
        <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
          <UserCircle className="w-3 h-3" /> {count} записей
        </p>
      </div>
    </div>
  );
}