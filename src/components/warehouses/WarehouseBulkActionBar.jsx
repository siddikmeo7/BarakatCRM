import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowRightLeft, Trash2, X, CheckSquare } from 'lucide-react';

// Панель массовых действий: появляется в режиме выбора товаров,
// чтобы можно было изменить, переместить или удалить все выбранные товары сразу.
export default function WarehouseBulkActionBar({ count, canEdit, canMove, canDelete, onEdit, onMove, onDelete, onClear }) {
  const empty = count === 0;

  return (
    <div className="sticky bottom-3 z-20 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-xl border border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <CheckSquare className="w-4 h-4 text-indigo-400" />
        Выбрано: {count}
      </span>
      <span className="text-xs text-slate-400">
        {empty ? 'Отметьте товары в списке' : 'Действия применяются ко всем выбранным товарам'}
      </span>

      <div className="flex items-center gap-2 flex-wrap ml-auto">
        {canEdit && (
          <Button
            size="sm"
            disabled={empty}
            onClick={onEdit}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
          >
            <Pencil className="w-3.5 h-3.5" />
            Изменить данные
          </Button>
        )}
        {canMove && (
          <Button
            size="sm"
            variant="outline"
            disabled={empty}
            onClick={onMove}
            className="gap-1.5 bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white disabled:opacity-40"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Переместить
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="outline"
            disabled={empty}
            onClick={onDelete}
            className="gap-1.5 bg-transparent border-red-500/60 text-red-300 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Удалить
          </Button>
        )}
        {!empty && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="gap-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
            Снять выбор
          </Button>
        )}
      </div>
    </div>
  );
}