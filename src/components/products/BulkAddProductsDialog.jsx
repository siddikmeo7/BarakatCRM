import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/search/SearchableSelect';
import { Plus, Trash2, Loader2, Package, CheckCheck, Copy } from 'lucide-react';

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
    boxes_in_stock: defaults.boxes_in_stock || 0,
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
  const [saved, setSaved] = useState(false);

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    // Clone last row's shared fields for convenience
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

  // Apply brand to all rows
  const applyBrandToAll = (brand) => setRows(prev => prev.map(r => ({ ...r, brand })));

  const handleSave = async () => {
    const validRows = rows.filter(r => r.brand.trim() && r.model.trim());
    if (validRows.length === 0) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      await Promise.all(validRows.map(async row => {
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
          description: `Добавлен товар: ${data.brand} ${data.model}`,
        });
      }));
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setRows([emptyRow(defaultsFromBiz), emptyRow(defaultsFromBiz)]);
        onSaved();
        onClose();
      }, 900);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const validCount = rows.filter(r => r.brand.trim() && r.model.trim()).length;

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
          {/* Info banner */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
            💡 Заполните модели для каждого товара. Общие поля (бренд, размер, цена) будут скопированы автоматически из предыдущей строки при добавлении.
          </div>

          {/* Common brand field */}
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
                    {/* Model — most important */}
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
                    <button onClick={() => duplicateRow(row._id)}
                      title="Дублировать строку"
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

                {/* Expanded options */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Select value={row.color} onValueChange={v => updateRow(row._id, 'color', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Input
                      type="text" inputMode="numeric"
                      value={row.size_from}
                      onChange={e => updateRow(row._id, 'size_from', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="От"
                      className="h-7 text-xs w-14 flex-1"
                    />
                    <Input
                      type="text" inputMode="numeric"
                      value={row.size_to}
                      onChange={e => updateRow(row._id, 'size_to', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="До"
                      className="h-7 text-xs w-14 flex-1"
                    />
                  </div>
                  <Select value={row.warehouse_id} onValueChange={v => updateRow(row._id, 'warehouse_id', v)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Склад" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text" inputMode="decimal"
                    value={row.purchase_price}
                    onChange={e => updateRow(row._id, 'purchase_price', e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Цена заку."
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add row button */}
          <button onClick={addRow}
            className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 text-sm font-medium hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Добавить строку
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Готово к сохранению: <span className="font-bold text-indigo-600">{validCount}</span> товаров
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button
              onClick={handleSave}
              disabled={saving || validCount === 0}
              className={`gap-2 ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               saved ? <CheckCheck className="w-4 h-4" /> :
               <Plus className="w-4 h-4" />}
              {saved ? 'Сохранено!' : `Сохранить ${validCount > 0 ? validCount : ''} товаров`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}