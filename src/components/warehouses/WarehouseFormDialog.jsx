import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

        <div className="py-1">
          <label className="wh-lbl">Название склада *</label>
          <input
            className="wh-email"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Основной склад"
          />

          <label className="wh-lbl">Адрес</label>
          <input
            className="wh-email"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Город, улица, дом"
          />

          <label className="wh-lbl">Email ответственного</label>
          <input
            className="wh-email"
            type="email"
            value={formData.manager_email}
            onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
            placeholder="manager@example.com"
          />

          <label className="wh-lbl">Значок склада</label>
          <div className="flex gap-2 mt-1">
            {icons.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormData({ ...formData, icon: key })}
                className={`wh-icon-pick ${formData.icon === key ? 'on' : ''}`}
              >
                <Icon className="w-5 h-5" style={{ color: formData.icon === key ? '#2563eb' : '#64748b' }} />
                <span className="text-[11px] text-slate-500">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button className="wh-btn" onClick={onClose}>Отмена</button>
          <button className="wh-btn pr" onClick={handleSave} disabled={saving || !formData.name}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : warehouse ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}