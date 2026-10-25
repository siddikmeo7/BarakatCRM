import React from 'react';
import { UserCircle } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { CARD, fmtMoney } from './expenseDesign';

// Правая колонка: расходы, записанные от имени других лиц
export default function SpentByPanel({ items = [], activeName = 'all', onToggle, onReset, getEmployee }) {
  return (
    <div className={`${CARD} p-5 flex flex-col gap-3.5`}>
      <div className="flex items-center gap-2">
        <UserCircle className="w-[18px] h-[18px] text-indigo-600 flex-none" />
        <h3 className="text-sm font-bold text-slate-900">Расходы от имени других лиц</h3>
      </div>
      <p className="-mt-2 text-xs font-medium text-slate-500">— за весь период бизнеса</p>

      <div className="flex flex-col gap-2.5">
        {items.map(item => {
          const employee = getEmployee?.(item.name);
          const active = activeName === item.name;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onToggle?.(item.name)}
              className={`exp-focus w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border cursor-pointer transition-all hover:shadow-[0_4px_14px_rgba(79,70,229,.18)] ${
                active ? 'border-indigo-500 bg-indigo-100' : 'border-indigo-200 bg-indigo-50'
              }`}
            >
              {employee ? (
                <EmployeeAvatar employee={employee} sizeClass="w-9 h-9 rounded-xl text-xs" />
              ) : (
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center flex-none">
                  <UserCircle className="w-[18px] h-[18px]" />
                </span>
              )}
              <span className="text-sm font-semibold text-slate-800 truncate">{item.name}</span>
              <span className="ml-auto text-sm font-bold text-red-600 tabular-nums flex-none">
                −{fmtMoney(item.total)} с.
              </span>
            </button>
          );
        })}
      </div>

      {activeName !== 'all' && (
        <button onClick={onReset} className="exp-focus text-xs text-indigo-600 hover:text-indigo-800 text-left transition-colors">
          Сбросить фильтр по лицу
        </button>
      )}
    </div>
  );
}