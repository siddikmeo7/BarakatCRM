import React from 'react';
import { Pencil, Trash2, Loader2, UserCircle, User } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getCategoryInfo } from './expenseCategories';
import { formatExpenseDay, formatAddedAt } from './expenseTime';
import { fmtMoney } from './expenseDesign';

const H = 'text-[10px] uppercase tracking-[.12em] font-bold text-slate-400';
const ACT = 'exp-focus w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed';

// Расходы одним списком: значок категории, кто добавил, во сколько добавил.
export default function ExpenseList({ expenses, maxEdits, getEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  return (
    <div className="col-span-full rounded-[22px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,.06)] overflow-hidden">
      <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_1.1fr_auto] gap-3 px-4 h-10 items-center border-b border-slate-100 bg-slate-50">
        <span className={H}>Расход</span>
        <span className={H}>Автор</span>
        <span className={H}>От имени</span>
        <span className={H}>Дата</span>
        <span className={H}>Добавлен</span>
        <span className={`${H} text-right`}>Сумма</span>
      </div>

      <div className="max-h-[62vh] overflow-y-auto custom-scroll divide-y divide-slate-100">
        {expenses.map((expense) => {
          const cat = getCategoryInfo(expense.category);
          const Icon = cat.icon;
          const emp = getEmployee(expense.created_by_name);
          const editsLeft = maxEdits - (expense.edit_count || 0);
          const editable = typeof canEdit === 'function' ? canEdit(expense) : canEdit;
          const deletable = typeof canDelete === 'function' ? canDelete(expense) : canDelete;

          return (
            <div
              key={expense.id}
              onClick={() => onOpen(expense)}
              className="grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_1.1fr_auto] gap-2 md:gap-3 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-slate-50"
            >
              {/* Категория со значком */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">{expense.category}</span>
                  {expense.description && (
                    <span className="block text-[11.5px] text-slate-500 truncate">{expense.description}</span>
                  )}
                  {expense.recipient && (
                    <span className="block text-[11.5px] text-slate-400 truncate">{expense.recipient}</span>
                  )}
                </span>
              </div>

              {/* Автор */}
              <div className="flex items-center gap-1.5 min-w-0 text-[12.5px] font-semibold text-slate-600">
                {expense.created_by_name ? (
                  <>
                    {emp
                      ? <EmployeeAvatar employee={emp} sizeClass="w-4 h-4 rounded-full text-[9px]" />
                      : <User className="w-3.5 h-3.5 text-indigo-500 flex-none" />}
                    <span className="truncate">{expense.created_by_name}</span>
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              {/* От имени */}
              <div className="flex items-center gap-1.5 min-w-0 text-[12.5px] font-semibold text-cyan-700">
                {expense.spent_by_name ? (
                  <>
                    <UserCircle className="w-3.5 h-3.5 flex-none" />
                    <span className="truncate">{expense.spent_by_name}</span>
                  </>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </div>

              {/* Дата расхода */}
              <span className="text-[12.5px] font-semibold text-slate-600 tabular-nums">
                {formatExpenseDay(expense.expense_date)}
              </span>

              {/* Когда добавлен */}
              <span className="text-[12.5px] font-semibold text-slate-500 tabular-nums">
                {formatAddedAt(expense.created_date)}
              </span>

              {/* Сумма и действия */}
              <div className="flex items-center gap-2 justify-between md:justify-end">
                <span className="text-base font-bold text-red-600 tabular-nums whitespace-nowrap">
                  −{fmtMoney(expense.amount)} с.
                </span>
                <div className="flex gap-1">
                  {editable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                      disabled={editsLeft <= 0}
                      title={editsLeft <= 0 ? 'Лимит редактирований исчерпан' : `Осталось редактирований: ${editsLeft}`}
                      className={ACT}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {deletable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
                      disabled={deleting === expense.id}
                      className={ACT}
                    >
                      {deleting === expense.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}