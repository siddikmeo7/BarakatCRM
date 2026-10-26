import React from 'react';
import { Pencil, ArrowRightLeft, Trash2, X } from 'lucide-react';

// Панель массовых действий: появляется при выборе товаров склада
export default function WarehouseBulkActionBar({ count, canEdit, canMove, canDelete, onEdit, onMove, onDelete, onClear }) {
  const empty = count === 0;

  return (
    <div className="wh-bulk">
      <span style={{ fontWeight: 700, fontSize: 13 }}>Выбрано: {count}</span>
      <span className="wh-sp" />
      <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canEdit && (
          <button className="wh-btn pr" disabled={empty} onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
            Изменить данные
          </button>
        )}
        {canMove && (
          <button className="wh-btn" disabled={empty} onClick={onMove}>
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Переместить
          </button>
        )}
        {canDelete && (
          <button className="wh-btn dg" disabled={empty} onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
            Удалить
          </button>
        )}
        <button className="wh-btn" onClick={onClear}>
          <X className="w-3.5 h-3.5" />
          Снять выбор
        </button>
      </span>
    </div>
  );
}