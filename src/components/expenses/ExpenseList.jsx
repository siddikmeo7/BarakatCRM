import React from 'react';
import { Pencil, Trash2, Loader2, UserCircle, User } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getCategoryInfo } from './expenseCategories';
import { formatExpenseDay, formatAddedAt } from './expenseTime';
import { fmtMoney } from './expenseDesign';

// Расходы строками списка «Пульса трат»: дата добавления — с точностью
// до минуты в 24-часовом формате.
export default function ExpenseList({ expenses, maxEdits, getEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  return (
    <div className="ep-list">
      <div className="ep-lh">
        <span>Расход</span>
        <span className="ep-c-author">Автор</span>
        <span className="ep-c-by">От имени</span>
        <span className="ep-c-date">Дата</span>
        <span>Добавлен</span>
        <span style={{ textAlign: 'right' }}>Сумма</span>
        <span />
      </div>

      <div className="ep-scroll">
        {expenses.map((expense, i) => {
          const cat = getCategoryInfo(expense.category);
          const Icon = cat.icon;
          const emp = getEmployee(expense.created_by_name);
          const byEmp = getEmployee(expense.spent_by_name);
          const editsLeft = maxEdits - (expense.edit_count || 0);
          const editable = typeof canEdit === 'function' ? canEdit(expense) : canEdit;
          const deletable = typeof canDelete === 'function' ? canDelete(expense) : canDelete;

          return (
            <div
              key={expense.id}
              onClick={() => onOpen(expense)}
              className="ep-lr"
              style={{ animationDelay: `${0.06 + i * 0.06}s` }}
            >
              <div className="ep-lc">
                <span className="ep-ico" style={{ '--soft': cat.soft }}>
                  <Icon style={{ color: cat.tone }} />
                </span>
                <span className="min-w-0">
                  <span className="ep-ln">{expense.category}</span>
                  {(expense.description || expense.recipient) && (
                    <span className="ep-ls">{expense.description || expense.recipient}</span>
                  )}
                </span>
              </div>

              <div className="ep-lcell ep-c-author">
                {expense.created_by_name ? (
                  <>
                    {emp
                      ? <EmployeeAvatar employee={emp} sizeClass="w-4 h-4 rounded-full text-[8px]" />
                      : <User />}
                    <span>{expense.created_by_name.trim()}</span>
                  </>
                ) : <span>—</span>}
              </div>

              <div className="ep-lcell ep-c-by">
                {expense.spent_by_name ? (
                  <>
                    {byEmp
                      ? <EmployeeAvatar employee={byEmp} sizeClass="w-4 h-4 rounded-full text-[8px]" />
                      : <UserCircle />}
                    <span>{expense.spent_by_name.trim()}</span>
                  </>
                ) : <span>—</span>}
              </div>

              <span className="ep-num ep-c-date">{formatExpenseDay(expense.expense_date)}</span>
              <span className="ep-num">{formatAddedAt(expense.created_date)}</span>
              <span className="ep-la">−{fmtMoney(expense.amount)} с.</span>

              <div className="ep-lacts">
                {editable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                    disabled={editsLeft <= 0}
                    title={editsLeft <= 0 ? 'Лимит редактирований исчерпан' : `Осталось редактирований: ${editsLeft}`}
                    className="ep-act"
                  >
                    <Pencil />
                  </button>
                )}
                {deletable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
                    disabled={deleting === expense.id}
                    className="ep-act"
                    title="Удалить расход"
                  >
                    {deleting === expense.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 />}
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