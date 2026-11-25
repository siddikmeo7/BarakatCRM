import React from 'react';
import { Pencil, Trash2, Loader2, User, UserCircle, Clock } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getCategoryInfo } from './expenseCategories';
import { formatExpenseDay, formatAddedAt } from './expenseTime';
import { fmtMoney } from './expenseDesign';

// Компактная карточка расхода для сетки «Пульса трат»: категория с иконкой,
// сумма, дата и время добавления в 24-часовом формате, автор и действия.
export default function ExpenseCard({ expense, index = 0, maxEdits, authorEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  const editsLeft = maxEdits - (expense.edit_count || 0);
  const cat = getCategoryInfo(expense.category);
  const Icon = cat.icon;

  return (
    <div
      onClick={onOpen}
      style={{ '--soft': cat.soft, animationDelay: `${0.04 + index * 0.03}s` }}
      className="ep-card"
    >
      <div className="ep-ct">
        <span className="ep-ico">
          <Icon style={{ color: cat.tone }} />
        </span>
        <div className="ep-cmain">
          <span className="ep-cc">{expense.category}</span>
          <span className="ep-cd">{formatExpenseDay(expense.expense_date)}</span>
        </div>
      </div>

      <div className="ep-amt">
        −{fmtMoney(expense.amount)}
        <i>с.</i>
      </div>

      <div className="ep-cmeta">
        <Clock />
        <span>{formatAddedAt(expense.created_date)}</span>
      </div>

      {(expense.description || expense.recipient || expense.created_by_name || expense.spent_by_name) && (
        <div className="ep-ctags">
          {expense.description && <span className="ep-nt-inline">{expense.description}</span>}
          {expense.created_by_name && (
            <span className="ep-s">
              {authorEmployee
                ? <EmployeeAvatar employee={authorEmployee} sizeClass="w-3 h-3 rounded-full text-[7px]" />
                : <User />}
              {expense.created_by_name}
            </span>
          )}
          {expense.recipient && <span className="ep-s">{expense.recipient}</span>}
          {expense.spent_by_name && (
            <span className="ep-s by">
              <UserCircle />
              {expense.spent_by_name}
            </span>
          )}
        </div>
      )}

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