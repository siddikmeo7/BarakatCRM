import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, Package, Loader2, CheckCheck, AlertCircle } from 'lucide-react';

export default function OrphanedProductsDialog({ open, onClose, orphanedProducts, warehouses, onSaved }) {
  const [targetWarehouse, setTargetWarehouse] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleMove = async () => {
    if (!targetWarehouse) return;
    setSaving(true);
    try {
      await Promise.all(orphanedProducts.map(p =>
        base44.entities.Product.update(p.id, { warehouse_id: targetWarehouse })
      ));
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved();
        onClose();
      }, 900);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Товары без склада
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Найдено <strong>{orphanedProducts.length}</strong> товаров, у которых удалён склад. Их можно переместить в другой склад.
          </div>

          {/* List of orphaned products */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {orphanedProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-xl">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.brand} {p.model}</p>
                  <p className="text-xs text-slate-400">{p.color} · {p.boxes_in_stock || 0} кор.</p>
                </div>
                <span className="text-xs text-amber-600 font-medium flex-shrink-0 bg-amber-50 px-2 py-0.5 rounded-full">
                  Нет склада
                </span>
              </div>
            ))}
          </div>

          {/* Target warehouse selector */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-indigo-500" />
              Переместить все в склад:
            </p>
            <Select value={targetWarehouse} onValueChange={setTargetWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите склад..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={onClose}>Закрыть</Button>
          <Button
            onClick={handleMove}
            disabled={saving || !targetWarehouse}
            className={`flex-1 gap-2 ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
             saved ? <CheckCheck className="w-4 h-4" /> :
             <Warehouse className="w-4 h-4" />}
            {saved ? 'Перемещено!' : `Переместить ${orphanedProducts.length} товаров`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}