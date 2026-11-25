import React from 'react';
import { Pencil, Trash2, Loader2, User, UserCircle, Clock } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getCategoryInfo } from './expenseCategories';
import { formatExpenseDay, formatAddedAt } from './expenseTime';
import { fmtMoney } from './expenseDesign';

// Карточка расхода в ленте «Пульса трат»: мягкая подложка категории,
// крупная сумма и точное время добавления в 24-часовом формате.
export default function ExpenseCard({ expense, index = 0, maxEdits, authorEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  const editsLeft = maxEdits - (expense.edit_count || 0);
  const cat = getCategoryInfo(expense.category);
  const Icon = cat.icon;

  return (
    <div
      onClick={onOpen}
      style={{ '--soft': cat.soft, animationDelay: `${0.06 + index * 0.06}s` }}
      className="ep-card"
    >
      <div className="ep-ct">
        <span className="ep-ico">
          <Icon style={{ color: cat.tone }} />
        </span>
        <div>
          <div className="ep-cc">{expense.category}</div>
          <div className="ep-cd">{formatExpenseDay(expense.expense_date)}</div>
        </div>
      </div>

      <div className="ep-amt">
        −{fmtMoney(expense.amount)}
        <i>с.</i>
      </div>

      {expense.description && <p className="ep-nt">{expense.description}</p>}

      <div className="ep-mt">
        <Clock />
        добавлен {formatAddedAt(expense.created_date)}
      </div>

      <div className="ep-st">
        {expense.recipient && <span className="ep-s">{expense.recipient}</span>}
        {expense.created_by_name && (
          <span className="ep-s">
            {authorEmployee
              ? <EmployeeAvatar employee={authorEmployee} sizeClass="w-3 h-3 rounded-full text-[8px]" />
              : <User />}
            {expense.created_by_name}
          </span>
        )}
        {expense.spent_by_name && (
          <span className="ep-s by">
            <UserCircle />
            от имени: {expense.spent_by_name}
          </span>
        )}
        {(expense.edit_count || 0) > 0 && (
          <span className="ep-s">
            <Pencil />
            {expense.edit_count}/{maxEdits}
          </span>
        )}
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