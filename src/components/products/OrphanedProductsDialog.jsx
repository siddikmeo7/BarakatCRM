import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, Package, Loader2, CheckCheck, AlertCircle, Trash2, CheckSquare, Square, ChevronDown } from 'lucide-react';

export default function OrphanedProductsDialog({ open, onClose, orphanedProducts, warehouses, onSaved }) {
  const [selected, setSelected] = useState(() => new Set(orphanedProducts.map(p => p.id)));
  const [targetWarehouse, setTargetWarehouse] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMode, setActionMode] = useState('move'); // 'move' | 'delete'
  const [done, setDone] = useState(false);

  // Sync selection when products change
  const allIds = useMemo(() => new Set(orphanedProducts.map(p => p.id)), [orphanedProducts]);
  const allSelected = allIds.size > 0 && [...allIds].every(id => selected.has(id));
  const someSelected = [...allIds].some(id => selected.has(id));
  const selectedCount = [...selected].filter(id => allIds.has(id)).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedProducts = orphanedProducts.filter(p => selected.has(p.id));

  const handleMove = async () => {
    if (!targetWarehouse || selectedProducts.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(selectedProducts.map(p =>
        base44.entities.Product.update(p.id, { warehouse_id: targetWarehouse })
      ));
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onSaved();
        onClose();
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Удалить ${selectedProducts.length} товаров? Это действие нельзя отменить.`)) return;
    setSaving(true);
    try {
      await Promise.all(selectedProducts.map(p =>
        base44.entities.Product.delete(p.id)
      ));
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onSaved();
        onClose();
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <DialogTitle className="text-amber-800 font-bold text-base">
              Товары без склада
            </DialogTitle>
            <p className="text-xs text-amber-600 mt-0.5">
              {orphanedProducts.length} товаров — склад удалён
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Select all row */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                : someSelected
                ? <CheckSquare className="w-4 h-4 text-slate-400" />
                : <Square className="w-4 h-4 text-slate-400" />
              }
              Выбрать все
            </button>
            <span className="text-xs text-slate-400">
              Выбрано: <strong className="text-slate-700">{selectedCount}</strong> из {orphanedProducts.length}
            </span>
          </div>

          {/* Products list */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {orphanedProducts.map(p => {
              const isSelected = selected.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleOne(p.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                      : <Square className="w-4 h-4 text-slate-300" />
                    }
                  </div>

                  {/* Photo */}
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-slate-300" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.brand} {p.model}</p>
                    <p className="text-xs text-slate-400">{p.color} · {p.boxes_in_stock || 0} кор. · {p.product_type || ''}</p>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-slate-700">{p.sale_price?.toLocaleString()} с.</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action tabs */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setActionMode('move')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                actionMode === 'move'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Warehouse className="w-4 h-4" />
              Переместить
            </button>
            <button
              onClick={() => setActionMode('delete')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                actionMode === 'delete'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          </div>

          {/* Move: warehouse selector */}
          {actionMode === 'move' && (
            <Select value={targetWarehouse} onValueChange={setTargetWarehouse}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите склад..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Delete: warning */}
          {actionMode === 'delete' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              ⚠️ Выбранные товары будут <strong>безвозвратно удалены</strong>. Убедитесь в правильности выбора.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Закрыть
          </Button>

          {actionMode === 'move' ? (
            <Button
              onClick={handleMove}
              disabled={saving || !targetWarehouse || selectedCount === 0}
              className={`flex-1 gap-2 ${done ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               done ? <CheckCheck className="w-4 h-4" /> :
               <Warehouse className="w-4 h-4" />}
              {done ? 'Перемещено!' : `Переместить ${selectedCount}`}
            </Button>
          ) : (
            <Button
              onClick={handleDelete}
              disabled={saving || selectedCount === 0}
              className={`flex-1 gap-2 ${done ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               done ? <CheckCheck className="w-4 h-4" /> :
               <Trash2 className="w-4 h-4" />}
              {done ? 'Удалено!' : `Удалить ${selectedCount}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}