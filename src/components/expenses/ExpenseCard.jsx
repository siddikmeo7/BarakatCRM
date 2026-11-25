import React from 'react';
import { Pencil, Trash2, Loader2, User, UserCircle, Clock } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getCategoryInfo } from './expenseCategories';
import { formatExpenseDay, formatAddedAt } from './expenseTime';
import { fmtMoney } from './expenseDesign';

// Карточка расхода в «кассовой книге»: цветная линия категории слева,
// сумма справа, точная дата и время добавления в 24-часовом формате.
export default function ExpenseCard({ expense, index = 0, maxEdits, authorEmployee, canEdit, canDelete, deleting, onOpen, onEdit, onDelete }) {
  const editsLeft = maxEdits - (expense.edit_count || 0);
  const cat = getCategoryInfo(expense.category);
  const Icon = cat.icon;

  return (
    <div
      onClick={onOpen}
      style={{ animationDelay: `${0.06 + index * 0.05}s`, borderLeftColor: cat.bar }}
      className="ex-card"
    >
      <div className="ex-card-top">
        <span className="ex-ico" style={{ color: cat.bar }}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ex-card-cat">{expense.category}</p>
          <p className="ex-card-date">{formatExpenseDay(expense.expense_date)}</p>
        </div>
        <p className="ex-card-amt">
          −{fmtMoney(expense.amount)}
          <i>с.</i>
        </p>
      </div>

      {expense.description && <p className="ex-card-note">{expense.description}</p>}

      <div className="ex-meta">
        <Clock className="w-3 h-3 flex-none" />
        добавлен {formatAddedAt(expense.created_date)}
      </div>

      <div className="ex-stamps">
        {expense.recipient && <span className="ex-stamp">{expense.recipient}</span>}
        {expense.created_by_name && (
          <span className="ex-stamp">
            {authorEmployee
              ? <EmployeeAvatar employee={authorEmployee} sizeClass="w-3.5 h-3.5 rounded-full text-[8px]" />
              : <User className="w-2.5 h-2.5" />}
            {expense.created_by_name}
          </span>
        )}
        {expense.spent_by_name && (
          <span className="ex-stamp by">
            <UserCircle className="w-2.5 h-2.5" />
            от имени: {expense.spent_by_name}
          </span>
        )}
        {(expense.edit_count || 0) > 0 && (
          <span className="ex-stamp edit">
            <Pencil className="w-2.5 h-2.5" />
            {expense.edit_count}/{maxEdits}
          </span>
        )}
      </div>

      <div className="ex-card-acts">
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
            disabled={editsLeft <= 0}
            title={editsLeft <= 0 ? 'Лимит редактирований исчерпан' : `Осталось редактирований: ${editsLeft}`}
            className="ex-act"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
            disabled={deleting === expense.id}
            className="ex-act"
            title="Удалить расход"
          >
            {deleting === expense.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}