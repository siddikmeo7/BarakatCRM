import React from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Pencil, Trash2, Loader2, User, UserCircle } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { CARD, EXPENSE_RECEIPT_IMG, fmtMoney } from './expenseDesign';

const TAG = 'text-[11.5px] px-2.5 py-[3px] rounded-full inline-flex items-center gap-1.5 font-semibold';
const ACT = 'exp-focus w-[30px] h-[30px] rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 active:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed';

// Карточка одного расхода в стене карточек
export default function ExpenseCard({ expense, index = 0, maxEdits, authorEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  const editsLeft = maxEdits - (expense.edit_count || 0);

  return (
    <div
      onClick={onOpen}
      style={{ animationDelay: `${0.2 + index * 0.12}s` }}
      className={`${CARD} expense-rise p-[18px] flex flex-col gap-3 cursor-pointer transition-shadow hover:shadow-[0_10px_28px_rgba(79,70,229,.16)]`}
    >
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-[14px] overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-white flex-none">
          <img src={EXPENSE_RECEIPT_IMG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-base text-slate-900 truncate">{expense.category}</p>
          <p className="text-[11.5px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3 h-3 flex-none" />
            {format(parseISO(expense.expense_date), 'dd MMM yyyy', { locale: ru })}
          </p>
        </div>
        <p className="ml-auto text-2xl font-bold text-red-600 tabular-nums tracking-[-.3px] flex-none">
          −{fmtMoney(expense.amount)} с.
        </p>
      </div>

      {expense.description && <p className="text-[12.5px] text-slate-500">{expense.description}</p>}

      <div className="flex flex-wrap gap-1.5">
        {expense.recipient && (
          <span className={`${TAG} bg-slate-100 text-slate-600`}>{expense.recipient}</span>
        )}
        {expense.created_by_name && (
          <span className={`${TAG} bg-indigo-50 text-indigo-600`}>
            {authorEmployee
              ? <EmployeeAvatar employee={authorEmployee} sizeClass="w-4 h-4 rounded-full text-[9px]" />
              : <User className="w-3 h-3" />}
            {expense.created_by_name}
          </span>
        )}
        {expense.spent_by_name && (
          <span className={`${TAG} bg-cyan-50 text-cyan-700`}>
            <UserCircle className="w-3 h-3" />
            от имени: {expense.spent_by_name}
          </span>
        )}
        {(expense.edit_count || 0) > 0 && (
          <span className={`${TAG} bg-amber-50 text-amber-600`}>
            <Pencil className="w-3 h-3" />
            {expense.edit_count}/{maxEdits}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 mt-auto justify-end">
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
            disabled={editsLeft <= 0}
            title={editsLeft <= 0 ? 'Лимит редактирований исчерпан' : `Осталось редактирований: ${editsLeft}`}
            className={ACT}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {canDelete && (
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
  );
}