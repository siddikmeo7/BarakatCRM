import React from 'react';
import { format } from 'date-fns';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

// Сотрудники бизнеса в админ-панели: фото, имя, почта, роль и последний вход
export default function BusinessEmployeesList({ employees = [] }) {
  const live = employees.filter(e => !e.deleted_at);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Сотрудники</p>
        <span className="text-xs font-semibold text-slate-500">{live.length}</span>
      </div>

      {live.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">Сотрудников пока нет</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
          {live.map(emp => (
            <div key={emp.id} className="px-4 py-2.5 flex items-center gap-3">
              <EmployeeAvatar employee={emp} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{emp.name}</p>
                <p className="text-xs text-slate-500 truncate">{emp.user_email}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                emp.is_admin
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {emp.is_admin ? 'Админ' : 'Сотрудник'}
              </span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                {emp.last_login_at ? format(new Date(emp.last_login_at), 'dd.MM.yy') : 'не входил'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}