import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserPlus } from 'lucide-react';

export default function CustomerForm({ open, onClose, onSave, editingCustomer, business }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => editingCustomer ? {
    name: editingCustomer.name || '',
    phone: editingCustomer.phone || '',
    whatsapp: editingCustomer.whatsapp || '',
    telegram: editingCustomer.telegram || '',
    email: editingCustomer.email || '',
    address: editingCustomer.address || '',
    use_phone_for_all: editingCustomer.use_phone_for_all !== false,
    debt_limit: editingCustomer.debt_limit || '',
    notes: editingCustomer.notes || ''
  } : {
    name: '', phone: '', whatsapp: '', telegram: '', email: '', address: '',
    use_phone_for_all: true, debt_limit: '', notes: ''
  });

  // Reset form when dialog opens with different customer
  React.useEffect(() => {
    if (open) {
      if (editingCustomer) {
        setFormData({
          name: editingCustomer.name || '',
          phone: editingCustomer.phone || '',
          whatsapp: editingCustomer.whatsapp || '',
          telegram: editingCustomer.telegram || '',
          email: editingCustomer.email || '',
          address: editingCustomer.address || '',
          use_phone_for_all: editingCustomer.use_phone_for_all !== false,
          debt_limit: editingCustomer.debt_limit || '',
          notes: editingCustomer.notes || ''
        });
      } else {
        setFormData({
          name: '', phone: '', whatsapp: '', telegram: '', email: '', address: '',
          use_phone_for_all: true, debt_limit: '', notes: ''
        });
      }
    }
  }, [open, editingCustomer]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...formData,
        debt_limit: formData.debt_limit ? parseFloat(formData.debt_limit) : null
      });
      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            {editingCustomer ? 'Редактировать клиента' : 'Добавить клиента'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3.5 py-2">
          <div>
            <Label className="text-sm font-medium">Имя клиента *</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Иван Иванов"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Телефон *</Label>
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+992..."
              className="mt-1.5"
            />
          </div>

          {/* Toggle for separate messenger numbers */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.use_phone_for_all}
              onChange={e => setFormData({ ...formData, use_phone_for_all: e.target.checked })}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            <span className="text-xs text-slate-600">Использовать основной телефон для WhatsApp и Telegram</span>
          </label>

          {!formData.use_phone_for_all && (
            <>
              <div>
                <Label className="text-sm font-medium">WhatsApp</Label>
                <Input
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Telegram</Label>
                <Input
                  value={formData.telegram}
                  onChange={e => setFormData({ ...formData, telegram: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Адрес</Label>
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Лимит долга (сомони)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={formData.debt_limit}
              onChange={e => setFormData({ ...formData, debt_limit: e.target.value.replace(/[^0-9.]/g, '') })}
              placeholder="Не ограничен"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Примечание о клиенте</Label>
            <Textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Кто это? Чем занимается? Регулярный покупатель? и т.д."
              rows={3}
              className="mt-1.5 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">Поможет владельцу понять кто этот клиент</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.phone}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCustomer ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}