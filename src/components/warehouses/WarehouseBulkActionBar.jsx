import React from 'react';
import { Pencil, ArrowRightLeft, Trash2, X } from 'lucide-react';

// Панель массовых действий: появляется при выборе товаров склада
export default function WarehouseBulkActionBar({ count, canEdit, canMove, canDelete, onEdit, onMove, onDelete, onClear }) {
  const empty = count === 0;

  return (
    <div className="sh-bulk">
      <b>Выбрано: {count}</b>
      {canEdit && (
        <button className="sh-btn pri" disabled={empty} onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
          Изменить данные
        </button>
      )}
      {canMove && (
        <button className="sh-btn" disabled={empty} onClick={onMove}>
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Переместить
        </button>
      )}
      {canDelete && (
        <button className="sh-btn dg" disabled={empty} onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
          Удалить
        </button>
      )}
      <button className="sh-btn" onClick={onClear}>
        <X className="w-3.5 h-3.5" />
        Снять выбор
      </button>
    </div>
  );
}