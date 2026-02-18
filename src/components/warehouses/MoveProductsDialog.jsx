import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function MoveProductsDialog({ products, warehouses, currentWarehouse, onClose, onMoved }) {
  const [selections, setSelections] = useState({}); // { productId: { boxes: 0, toWarehouseId: '' } }
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const otherWarehouses = warehouses.filter(wh => wh.id !== currentWarehouse.id);

  const updateSelection = (productId, field, value) => {
    setSelections(prev => ({
      ...prev,
      [productId]: { boxes: 0, toWarehouseId: '', ...prev[productId], [field]: value }
    }));
  };

  const selectedItems = Object.entries(selections).filter(
    ([_, v]) => v.toWarehouseId && parseInt(v.boxes) > 0
  );

  const handleMove = async () => {
    setSaving(true);
    try {
      for (const [productId, sel] of selectedItems) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;
        const boxesToMove = parseInt(sel.boxes);
        const targetWarehouseId = sel.toWarehouseId;

        // Уменьшаем на текущем складе
        await base44.entities.Product.update(productId, {
          boxes_in_stock: Math.max(0, (product.boxes_in_stock || 0) - boxesToMove)
        });

        // Ищем такой же товар на целевом складе (по бренду + модели + цвету)
        const targetProduct = products.find(p =>
          p.warehouse_id === targetWarehouseId &&
          p.brand === product.brand &&
          p.model === product.model &&
          p.color === product.color &&
          p.id !== productId
        );

        if (targetProduct) {
          // Добавляем к существующему
          await base44.entities.Product.update(targetProduct.id, {
            boxes_in_stock: (targetProduct.boxes_in_stock || 0) + boxesToMove
          });
        } else {
          // Создаём новую запись на целевом складе
          const { id, created_date, updated_date, created_by, ...productData } = product;
          await base44.entities.Product.create({
            ...productData,
            warehouse_id: targetWarehouseId,
            boxes_in_stock: boxesToMove
          });
        }
      }
      setDone(true);
      setTimeout(() => { onMoved(); onClose(); }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-indigo-600" />
            Переместить товары
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-3 text-emerald-600">
            <CheckCircle className="w-12 h-12" />
            <p className="font-semibold text-lg">Перемещение выполнено!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              Из склада: <span className="font-medium text-slate-800">{currentWarehouse.name}</span>
            </p>

            <div className="space-y-3">
              {products.map(product => {
                const sel = selections[product.id] || {};
                const maxBoxes = product.boxes_in_stock || 0;
                const isSelected = sel.toWarehouseId && parseInt(sel.boxes) > 0;

                return (
                  <div key={product.id} className={`p-3 rounded-xl border transition-all ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {product.photo_url ? (
                        <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{product.brand} {product.model}</p>
                        <p className="text-xs text-slate-500">На складе: <span className="font-semibold text-indigo-600">{maxBoxes}</span> коробок</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Коробок (макс. {maxBoxes})</p>
                        <Input
                          type="text" inputMode="numeric"
                          value={sel.boxes || ''}
                          onChange={(e) => {
                            const v = Math.min(parseInt(e.target.value.replace(/\D/g,'')) || 0, maxBoxes);
                            updateSelection(product.id, 'boxes', v);
                          }}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">На склад</p>
                        <Select
                          value={sel.toWarehouseId || ''}
                          onValueChange={(v) => updateSelection(product.id, 'toWarehouseId', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Выбрать" />
                          </SelectTrigger>
                          <SelectContent>
                            {otherWarehouses.map(wh => (
                              <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {products.length === 0 && (
              <p className="text-center text-slate-500 py-6">На складе нет товаров</p>
            )}

            {selectedItems.length > 0 && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-xl text-sm text-indigo-700">
                Выбрано к перемещению: <b>{selectedItems.length}</b> позиций
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
              <Button
                onClick={handleMove}
                disabled={saving || selectedItems.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" />Переместить</>}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}