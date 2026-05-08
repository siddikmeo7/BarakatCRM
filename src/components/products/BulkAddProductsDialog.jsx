import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Package, CheckCheck, Copy, Box, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

const BASE_PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const BASE_COLORS = ['Чёрный', 'Белый', 'Коричневый', 'Синий', 'Красный', 'Серый', 'Бежевый', 'Другой'];

function emptyRow(defaults = {}) {
  return {
    _id: Math.random().toString(36).slice(2),
    brand: defaults.brand || '',
    model: '',
    product_type: defaults.product_type || 'Туфли',
    color: defaults.color || 'Чёрный',
    size_from: defaults.size_from || 39,
    size_to: defaults.size_to || 44,
    pairs_per_box: defaults.pairs_per_box || 6,
    purchase_price: defaults.purchase_price || '',
    sale_price: defaults.sale_price || '',
    boxes_in_stock: defaults.boxes_in_stock || '',
    warehouse_id: defaults.warehouse_id || '',
  };
}

export default function BulkAddProductsDialog({ open, onClose, business, warehouses, onSaved }) {
  const allProductTypes = [...BASE_PRODUCT_TYPES, ...(business?.custom_product_types || [])];
  const allColors = [...BASE_COLORS, ...(business?.custom_colors || [])];

  const defaultsFromBiz = {
    product_type: business?.default_product_type || 'Туфли',
    color: business?.default_color || 'Чёрный',
    size_from: business?.default_size_from || 39,
    size_to: business?.default_size_to || 44,
    pairs_per_box: business?.default_pairs_per_box || 6,
    warehouse_id: warehouses[0]?.id || '',
  };

  const [rows, setRows] = useState([emptyRow(defaultsFromBiz), emptyRow(defaultsFromBiz)]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, errors }
  const savingRef = useRef(false);

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    const last = rows[rows.length - 1] || {};
    setRows(prev => [...prev, emptyRow({
      brand: last.brand,
      product_type: last.product_type,
      color: last.color,
      size_from: last.size_from,
      size_to: last.size_to,
      pairs_per_box: last.pairs_per_box,
      purchase_price: last.purchase_price,
      sale_price: last.sale_price,
      boxes_in_stock: last.boxes_in_stock,
      warehouse_id: last.warehouse_id,
    })]);
  };

  const removeRow = (id) => setRows(prev => prev.filter(r => r._id !== id));

  const duplicateRow = (id) => {
    const row = rows.find(r => r._id === id);
    if (!row) return;
    const newRow = { ...row, _id: Math.random().toString(36).slice(2), model: '' };
    setRows(prev => {
      const idx = prev.findIndex(r => r._id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  };

  const applyBrandToAll = (brand) => setRows(prev => prev.map(r => ({ ...r, brand })));

  // Сохраняем строго последовательно — гарантия что каждый товар добавится
  const handleSave = async () => {
    if (savingRef.current) return;
    const validRows = rows.filter(r => r.brand.trim() && r.model.trim());
    if (validRows.length === 0) return;

    savingRef.current = true;
    setSaving(true);
    setProgress({ done: 0, total: validRows.length, errors: 0 });

    let done = 0;
    let errors = 0;

    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));

      // Строго последовательно — один за другим, не Promise.all
      for (const row of validRows) {
        try {
          const data = {
            business_id: business.id,
            brand: row.brand.trim(),
            model: row.model.trim(),
            product_type: row.product_type,
            color: row.color,
            size_from: parseInt(row.size_from) || 39,
            size_to: parseInt(row.size_to) || 44,
            pairs_per_box: parseInt(row.pairs_per_box) || 6,
            purchase_price: parseFloat(row.purchase_price) || 0,
            sale_price: parseFloat(row.sale_price) || 0,
            boxes_in_stock: parseInt(row.boxes_in_stock) || 0,
            warehouse_id: row.warehouse_id || '',
          };
          const created = await base44.entities.Product.create(data);
          await base44.entities.ActivityLog.create({
            business_id: business.id,
            action_type: 'create',
            entity_type: 'Product',
            entity_id: created.id,
            entity_data: data,
            user_email: user.email,
            description: `Добавлен товар: ${data.brand} ${data.model} (${data.boxes_in_stock} кор., ${data.sale_price?.toLocaleString()} с.)`,
          });
          done++;
        } catch (err) {
          console.error('Ошибка при добавлении строки:', err);
          errors++;
        }
        setProgress({ done, total: validRows.length, errors });
      }

      // После завершения — обновляем список и закрываем
      await onSaved();
      setTimeout(() => {
        setRows([emptyRow(defaultsFromBiz), emptyRow(defaultsFromBiz)]);
        setProgress(null);
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const validRows = rows.filter(r => r.brand.trim() && r.model.trim());
  const validCount = validRows.length;

  // Итоговая сводка
  const totalBoxes = validRows.reduce((sum, r) => sum + (parseInt(r.boxes_in_stock) || 0), 0);
  const totalSaleValue = validRows.reduce((sum, r) => sum + ((parseInt(r.boxes_in_stock) || 0) * (parseFloat(r.sale_price) || 0)), 0);
  const totalPurchaseValue = validRows.reduce((sum, r) => sum + ((parseInt(r.boxes_in_stock) || 0) * (parseFloat(r.purchase_price) || 0)), 0);
  const totalProfit = totalSaleValue - totalPurchaseValue;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Добавить много товаров
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Info */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
            💡 Заполните модели для каждого товара. Общие поля копируются из предыдущей строки.
          </div>

          {/* Common brand */}
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs font-semibold text-slate-500">Бренд (применить ко всем)</Label>
                <Input
                  value={rows[0]?.brand || ''}
                  onChange={e => applyBrandToAll(e.target.value)}
                  placeholder="Nike, Adidas..."
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div className="text-xs text-slate-400">{rows.length} строк</div>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={row._id} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="col-span-2 sm:col-span-1">
                      <Input
                        value={row.model}
                        onChange={e => updateRow(row._id, 'model', e.target.value)}
                        placeholder="Модель *"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="text" inputMode="numeric"
                        value={row.boxes_in_stock}
                        onChange={e => updateRow(row._id, 'boxes_in_stock', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Коробок"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="text" inputMode="decimal"
                        value={row.sale_price}
                        onChange={e => updateRow(row._id, 'sale_price', e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder="Цена прод."
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => duplicateRow(row._id)} title="Дублировать"
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(row._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Select value={row.color} onValueChange={v => updateRow(row._id, 'color', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Input type="text" inputMode="numeric"
                      value={row.size_from}
                      onChange={e => updateRow(row._id, 'size_from', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="От" className="h-7 text-xs flex-1" />
                    <Input type="text" inputMode="numeric"
                      value={row.size_to}
                      onChange={e => updateRow(row._id, 'size_to', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="До" className="h-7 text-xs flex-1" />
                  </div>
                  <Select value={row.warehouse_id} onValueChange={v => updateRow(row._id, 'warehouse_id', v)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Склад" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="text" inputMode="decimal"
                    value={row.purchase_price}
                    onChange={e => updateRow(row._id, 'purchase_price', e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Цена заку." className="h-7 text-xs" />
                </div>

                {/* Мини-итог по строке */}
                {row.boxes_in_stock && row.sale_price && (
                  <div className="mt-2 flex gap-3 text-xs text-slate-500 pl-1">
                    <span>📦 {parseInt(row.boxes_in_stock) || 0} кор.</span>
                    <span>💰 {((parseInt(row.boxes_in_stock) || 0) * (parseFloat(row.sale_price) || 0)).toLocaleString()} с.</span>
                    {row.purchase_price && (
                      <span className="text-emerald-600">
                        📈 +{((parseInt(row.boxes_in_stock) || 0) * ((parseFloat(row.sale_price) || 0) - (parseFloat(row.purchase_price) || 0))).toLocaleString()} с.
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add row */}
          <button onClick={addRow}
            className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 text-sm font-medium hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Добавить строку
          </button>

          {/* Итоговая сводка */}
          {validCount > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">📊 Итого по {validCount} товарам</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                  <Box className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Коробок</p>
                  <p className="text-xl font-bold text-indigo-600">{totalBoxes}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                  <DollarSign className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Сумма продаж</p>
                  <p className="text-lg font-bold text-blue-600">{totalSaleValue.toLocaleString()} с.</p>
                </div>
                {totalPurchaseValue > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                    <Package className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">По закупке</p>
                    <p className="text-lg font-bold text-slate-600">{totalPurchaseValue.toLocaleString()} с.</p>
                  </div>
                )}
                {totalPurchaseValue > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Прибыль</p>
                    <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()} с.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Прогресс сохранения */}
          {progress && (
            <div className={`rounded-xl p-3 border ${progress.errors > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {progress.done < progress.total ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                ) : progress.errors > 0 ? (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                )}
                <span className="text-sm font-semibold">
                  {progress.done < progress.total
                    ? `Сохранение... ${progress.done} / ${progress.total}`
                    : progress.errors > 0
                    ? `Сохранено ${progress.done} из ${progress.total} (${progress.errors} ошибок)`
                    : `✅ Все ${progress.done} товаров успешно добавлены!`}
                </span>
              </div>
              {/* Прогресс бар */}
              <div className="w-full bg-white rounded-full h-2 border border-slate-200">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${progress.errors > 0 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Готово к сохранению: <span className="font-bold text-indigo-600">{validCount}</span> товаров
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Отмена</Button>
            <Button
              onClick={handleSave}
              disabled={saving || validCount === 0}
              className={`gap-2 ${progress?.done === progress?.total && progress?.done > 0 ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               progress?.done === progress?.total && progress?.done > 0 ? <CheckCheck className="w-4 h-4" /> :
               <Plus className="w-4 h-4" />}
              {progress?.done === progress?.total && progress?.done > 0
                ? 'Сохранено!'
                : `Сохранить ${validCount > 0 ? validCount : ''} товаров`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}