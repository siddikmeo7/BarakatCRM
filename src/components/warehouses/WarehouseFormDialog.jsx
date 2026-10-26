import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// Форма создания и редактирования склада.
// Свои поля она держит у себя, поэтому страница складов остаётся компактной.
export default function WarehouseFormDialog({ open, warehouse, business, icons = [], onClose, onSaved }) {
  const [formData, setFormData] = useState({ name: '', address: '', manager_email: '', icon: 'Warehouse' });
  const [saving, setSaving] = useState(false);

  // При открытии показываем данные того склада, который редактируем
  useEffect(() => {
    if (!open) return;
    setFormData({
      name: warehouse?.name || '',
      address: warehouse?.address || '',
      manager_email: warehouse?.manager_email || '',
      icon: warehouse?.icon || 'Warehouse',
    });
  }, [open, warehouse]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...formData, business_id: business?.id };
      if (warehouse) {
        await base44.entities.Warehouse.update(warehouse.id, data);
      } else {
        await base44.entities.Warehouse.create(data);
      }
      onSaved?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Редактировать склад' : 'Добавить склад'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label>Название склада *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Основной склад"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Адрес</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Город, улица, дом"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Email ответственного</Label>
            <Input
              type="email"
              value={formData.manager_email}
              onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
              placeholder="manager@example.com"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Значок склада</Label>
            <div className="flex gap-2 mt-1.5">
              {icons.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: key })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all flex-1 ${formData.icon === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                >
                  <Icon className={`w-5 h-5 ${formData.icon === key ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : warehouse ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}