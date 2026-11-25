import React from 'react';
import { Pencil, Trash2, Loader2, User, UserCircle, Clock } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getCategoryInfo } from './expenseCategories';
import { formatExpenseDay, formatAddedAt } from './expenseTime';
import { fmtMoney } from './expenseDesign';

// Компактная карточка расхода в ленте «Пульса трат»: одна строка в коробке —
// иконка категории, дата и время добавления (24 ч), сумма и действия.
export default function ExpenseCard({ expense, index = 0, maxEdits, authorEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  const editsLeft = maxEdits - (expense.edit_count || 0);
  const cat = getCategoryInfo(expense.category);
  const Icon = cat.icon;
  const hasTags = expense.recipient || expense.spent_by_name || (expense.edit_count || 0) > 0;

  return (
    <div
      onClick={onOpen}
      style={{ '--soft': cat.soft, animationDelay: `${0.04 + index * 0.04}s` }}
      className="ep-card"
    >
      <span className="ep-ico">
        <Icon style={{ color: cat.tone }} />
      </span>

      <div className="ep-cmain">
        <div className="ep-crow">
          <span className="ep-cc">{expense.category}</span>
          <span className="ep-cd">{formatExpenseDay(expense.expense_date)}</span>
        </div>

        <div className="ep-cmeta">
          <Clock />
          <span>{formatAddedAt(expense.created_date)}</span>
          {expense.created_by_name && (
            <>
              {authorEmployee
                ? <EmployeeAvatar employee={authorEmployee} sizeClass="w-3.5 h-3.5 rounded-full text-[7px]" />
                : <User />}
              <span>{expense.created_by_name}</span>
            </>
          )}
        </div>

        {(expense.description || hasTags) && (
          <div className="ep-ctags">
            {expense.description && <span className="ep-nt-inline">{expense.description}</span>}
            {expense.recipient && <span className="ep-s">{expense.recipient}</span>}
            {expense.spent_by_name && (
              <span className="ep-s by">
                <UserCircle />
                {expense.spent_by_name}
              </span>
            )}
            {(expense.edit_count || 0) > 0 && (
              <span className="ep-s">
                <Pencil />
                {expense.edit_count}/{maxEdits}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="ep-amt">
        −{fmtMoney(expense.amount)}
        <i>с.</i>
      </div>

      <div className="ep-acts">
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
            disabled={editsLeft <= 0}
            title={editsLeft <= 0 ? 'Лимит редактирований исчерпан' : `Осталось редактирований: ${editsLeft}`}
            className="ep-act"
          >
            <Pencil />
          </button>
        )}
        {canDelete && (
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
}