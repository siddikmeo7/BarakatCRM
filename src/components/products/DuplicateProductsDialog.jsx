import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Loader2, Package, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * duplicateGroups: массив групп, каждая группа — массив товаров с одинаковым brand+model
 * onSaved: вызывается после удаления
 */
export default function DuplicateProductsDialog({ open, onClose, duplicateGroups, onSaved }) {
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedGroup, setExpandedGroup] = useState(null);

  // При открытии — авто-выбираем "лишние" (все кроме первого в каждой группе)
  React.useEffect(() => {
    if (!open) return;
    const autoSelected = new Set();
    duplicateGroups.forEach(group => {
      // Оставляем первый (самый старый), остальные предлагаем удалить
      const sorted = [...group].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      sorted.slice(1).forEach(p => autoSelected.add(p.id));
    });
    setSelectedIds(autoSelected);
    setExpandedGroup(null);
  }, [open, duplicateGroups]);

  const toggleId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllExtras = () => {
    const all = new Set();
    duplicateGroups.forEach(group => {
      const sorted = [...group].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      sorted.slice(1).forEach(p => all.add(p.id));
    });
    setSelectedIds(all);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      const allProducts = duplicateGroups.flat();
      const toDelete = allProducts.filter(p => selectedIds.has(p.id));

      await Promise.all([
        ...toDelete.map(p => base44.entities.Product.delete(p.id)),
        ...toDelete.map(p =>
          base44.entities.ActivityLog.create({
            business_id: p.business_id,
            action_type: 'delete',
            entity_type: 'Product',
            entity_id: p.id,
            entity_data: p,
            user_email: user.email,
            description: `Удалён дубликат товара: ${p.brand} ${p.model}`,
          })
        ),
      ]);

      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const totalDuplicates = duplicateGroups.reduce((s, g) => s + g.length - 1, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Найдены дубликаты товаров
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Найдено <strong>{duplicateGroups.length}</strong> групп с дубликатами (<strong>{totalDuplicates}</strong> лишних записей).
            Выберите товары для удаления или воспользуйтесь авто-выбором.
          </p>

          <div className="flex gap-2">
            <button
              onClick={selectAllExtras}
              className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-medium transition-colors"
            >
              Выбрать все лишние
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors"
            >
              Снять всё
            </button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {duplicateGroups.map((group, gi) => {
              const key = `${group[0].brand}__${group[0].model}`;
              const sorted = [...group].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
              const isOpen = expandedGroup === gi;
              return (
                <div key={key} className="border border-amber-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
                    onClick={() => setExpandedGroup(isOpen ? null : gi)}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-slate-800 text-sm">{group[0].brand} {group[0].model}</span>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        {group.length} шт.
                      </span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-amber-500" /> : <ChevronDown className="w-4 h-4 text-amber-500" />}
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-slate-100">
                      {sorted.map((p, idx) => {
                        const isFirst = idx === 0;
                        const isChecked = selectedIds.has(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => !isFirst && toggleId(p.id)}
                            className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                              isFirst
                                ? 'bg-green-50 cursor-default'
                                : isChecked
                                ? 'bg-red-50 cursor-pointer hover:bg-red-100'
                                : 'bg-white cursor-pointer hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                              isFirst
                                ? 'border-green-400 bg-green-100'
                                : isChecked
                                ? 'border-red-500 bg-red-500'
                                : 'border-slate-300'
                            }`}>
                              {isFirst && <span className="text-green-600 text-[8px] font-bold">✓</span>}
                              {!isFirst && isChecked && <span className="text-white text-[8px] font-bold">✕</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${isFirst ? 'text-green-700' : isChecked ? 'text-red-700' : 'text-slate-700'}`}>
                                {isFirst ? '✅ Оставить (оригинал)' : '🗑 Удалить (дубликат)'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {p.boxes_in_stock || 0} кор. · {p.sale_price?.toLocaleString()} с. ·{' '}
                                {p.created_date ? new Date(p.created_date).toLocaleDateString('ru') : '—'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedIds.size > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              ⚠️ Будет удалено <strong>{selectedIds.size}</strong> товаров. Это действие необратимо.
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>
            Закрыть
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting || selectedIds.size === 0}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {deleting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />}
            Удалить {selectedIds.size > 0 ? selectedIds.size : ''} дубликатов
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}