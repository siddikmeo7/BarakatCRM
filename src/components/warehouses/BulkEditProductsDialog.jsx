import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const NUMBER_FIELDS = ['size_from', 'size_to', 'pairs_per_box', 'purchase_price', 'sale_price', 'boxes_in_stock'];

// Поля, которые можно изменить сразу у всех выбранных товаров
const FIELDS = [
  { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'Например, Ecco' },
  { key: 'model', label: 'Модель', type: 'text', placeholder: 'Например, 13' },
  { key: 'product_type', label: 'Тип товара', type: 'select' },
  { key: 'color', label: 'Цвет', type: 'text', placeholder: 'Например, Чёрный' },
  { key: 'size_from', label: 'Размер от', type: 'number' },
  { key: 'size_to', label: 'Размер до', type: 'number' },
  { key: 'pairs_per_box', label: 'Пар в коробке', type: 'number' },
  { key: 'purchase_price', label: 'Цена закупки за коробку', type: 'number' },
  { key: 'sale_price', label: 'Цена продажи за коробку', type: 'number' },
  { key: 'boxes_in_stock', label: 'Коробок на складе', type: 'number' },
  { key: 'warehouse_id', label: 'Перенести в склад', type: 'warehouse' },
];

// Массовое изменение данных выбранных товаров: отмечаете нужные поля и задаёте значения
export default function BulkEditProductsDialog({ open, onClose, products = [], business, warehouses = [], onSaved }) {
  const [enabled, setEnabled] = useState({});
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const toggleField = (key) => setEnabled(prev => ({ ...prev, [key]: !prev[key] }));
  const setValue = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

  const typeOptions = Array.from(new Set([...(business?.custom_product_types || []), ...PRODUCT_TYPES]));
  const activeFields = FIELDS.filter(f => enabled[f.key]);
  const canSave = activeFields.length > 0 && products.length > 0 && !saving;

  const handleClose = () => {
    setEnabled({});
    setValues({});
    onClose?.();
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const changes = {};
      activeFields.forEach(f => {
        const raw = values[f.key];
        changes[f.key] = NUMBER_FIELDS.includes(f.key) ? (parseFloat(raw) || 0) : (raw ?? '');
      });

      await base44.entities.Product.bulkUpdate(products.map(p => ({ id: p.id, ...changes })));

      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      await base44.entities.ActivityLog.create({
        business_id: business?.id,
        action_type: 'update',
        entity_type: 'Product',
        entity_id: products[0].id,
        entity_data: { ids: products.map(p => p.id), changes },
        user_email: user.email,
        user_name: user.full_name || '',
        description: `Массовое изменение ${products.length} товаров: ${activeFields.map(f => f.label).join(', ')}`
      });

      onSaved?.();
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Изменить данные товаров
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Выбрано товаров: <span className="font-semibold text-slate-800 dark:text-slate-200">{products.length}</span>.
          Отметьте поля, которые нужно изменить — новые значения применятся ко всем выбранным товарам.
        </p>

        <div className="flex-1 overflow-y-auto custom-scroll space-y-2 py-1">
          {FIELDS.map(f => {
            const on = !!enabled[f.key];
            return (
              <div
                key={f.key}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                  on ? 'border-indigo-300 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleField(f.key)}
                  className={cn(
                    'w-5 h-5 rounded-md border flex items-center justify-center flex-none transition-colors',
                    on ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'
                  )}
                  title={on ? 'Не изменять это поле' : 'Изменить это поле'}
                >
                  {on && <Check className="w-3.5 h-3.5 text-white" />}
                </button>

                <span className="text-sm text-slate-700 dark:text-slate-300 w-44 flex-none">{f.label}</span>

                <div className="flex-1 min-w-0">
                  {f.type === 'warehouse' ? (
                    <Select value={values[f.key] || ''} onValueChange={v => setValue(f.key, v)} disabled={!on}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Выберите склад" /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : f.type === 'select' ? (
                    <Select value={values[f.key] || ''} onValueChange={v => setValue(f.key, v)} disabled={!on}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === 'number' ? 'number' : 'text'}
                      inputMode={f.type === 'number' ? 'decimal' : undefined}
                      value={values[f.key] ?? ''}
                      onChange={e => setValue(f.key, e.target.value)}
                      disabled={!on}
                      placeholder={f.placeholder}
                      className="h-9"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex-1">
            {activeFields.length === 0
              ? 'Отметьте хотя бы одно поле'
              : `Изменится полей: ${activeFields.length}`}
          </p>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={!canSave} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Применить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}