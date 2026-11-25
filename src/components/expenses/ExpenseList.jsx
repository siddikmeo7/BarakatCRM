import React from 'react';
import { Pencil, Trash2, Loader2, UserCircle, User } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getCategoryInfo } from './expenseCategories';
import { formatExpenseDay, formatAddedAt } from './expenseTime';
import { fmtMoney } from './expenseDesign';

// Расходы строками «кассовой книги»: дата добавления — с точностью до минуты
// в 24-часовом формате, суммы выровнены по правому краю.
export default function ExpenseList({ expenses, maxEdits, getEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  return (
    <div className="ex-list">
      <div className="ex-lh">
        <span>Расход</span>
        <span className="ex-col-author">Автор</span>
        <span className="ex-col-by">От имени</span>
        <span className="ex-col-date">Дата</span>
        <span>Добавлен</span>
        <span style={{ textAlign: 'right' }}>Сумма</span>
        <span />
      </div>

      <div className="ex-scroll">
        {expenses.map((expense) => {
          const cat = getCategoryInfo(expense.category);
          const Icon = cat.icon;
          const emp = getEmployee(expense.created_by_name);
          const editsLeft = maxEdits - (expense.edit_count || 0);
          const editable = typeof canEdit === 'function' ? canEdit(expense) : canEdit;
          const deletable = typeof canDelete === 'function' ? canDelete(expense) : canDelete;

          return (
            <div key={expense.id} onClick={() => onOpen(expense)} className="ex-lr">
              <div className="ex-lr-cat">
                <span className="ex-ico" style={{ color: cat.bar }}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="ex-lr-name">{expense.category}</span>
                  {(expense.description || expense.recipient) && (
                    <span className="ex-lr-sub">{expense.description || expense.recipient}</span>
                  )}
                </span>
              </div>

              <div className="ex-lr-cell ex-col-author">
                {expense.created_by_name ? (
                  <>
                    {emp
                      ? <EmployeeAvatar employee={emp} sizeClass="w-3.5 h-3.5 rounded-full text-[8px]" />
                      : <User className="w-3 h-3 flex-none" />}
                    <span>{expense.created_by_name}</span>
                  </>
                ) : <span>—</span>}
              </div>

              <div className="ex-lr-cell by ex-col-by">
                {expense.spent_by_name ? (
                  <>
                    <UserCircle className="w-3 h-3 flex-none" />
                    <span>{expense.spent_by_name}</span>
                  </>
                ) : <span>—</span>}
              </div>

              <span className="ex-lr-num ex-col-date">{formatExpenseDay(expense.expense_date)}</span>
              <span className="ex-lr-num">{formatAddedAt(expense.created_date)}</span>
              <span className="ex-lr-amt">−{fmtMoney(expense.amount)} с.</span>

              <div className="flex items-center justify-end gap-1">
                {editable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                    disabled={editsLeft <= 0}
                    title={editsLeft <= 0 ? 'Лимит редактирований исчерпан' : `Осталось редактирований: ${editsLeft}`}
                    className="ex-act"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {deletable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
                    disabled={deleting === expense.id}
                    className="ex-act"
                    title="Удалить расход"
                  >
                    {deleting === expense.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}