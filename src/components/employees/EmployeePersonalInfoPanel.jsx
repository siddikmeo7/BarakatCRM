import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, MapPin, MessageCircle, Calendar, Save, CheckCircle, Loader2 } from 'lucide-react';

export default function EmployeePersonalInfoPanel({ employee, onSaved }) {
  const [info, setInfo] = useState({
    full_name: employee?.full_name || employee?.name || '',
    phone: employee?.phone || '',
    phone2: employee?.phone2 || '',
    whatsapp: employee?.whatsapp || '',
    telegram: employee?.telegram || '',
    age: employee?.age || '',
    address: employee?.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Employee.update(employee.id, {
        full_name: info.full_name,
        phone: info.phone,
        phone2: info.phone2,
        whatsapp: info.whatsapp,
        telegram: info.telegram,
        age: info.age ? Number(info.age) : null,
        address: info.address,
      });
      if (window.__barakatEmployee) {
        window.__barakatEmployee = { ...window.__barakatEmployee, ...info };
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await onSaved?.();
    } catch (err) {
      alert('Ошибка сохранения: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const field = (icon, label, key, placeholder, type = 'text', colSpan = false) => (
    <div className={colSpan ? 'col-span-2' : ''}>
      <Label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
        {icon}{label}
      </Label>
      <Input
        type={type}
        value={info[key]}
        onChange={e => setInfo(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Личная информация</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ваши контактные данные</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {field(<User className="w-3 h-3" />, 'Полное имя', 'full_name', 'Иванов Иван Иванович')}
          {field(<Calendar className="w-3 h-3" />, 'Возраст', 'age', '25', 'number')}
          {field(<Phone className="w-3 h-3" />, 'Телефон 1', 'phone', '+992 XXX XX XX XX')}
          {field(<Phone className="w-3 h-3" />, 'Телефон 2', 'phone2', '+992 XXX XX XX XX')}
          {field(<MessageCircle className="w-3 h-3" />, 'WhatsApp', 'whatsapp', '+992 XXX XX XX XX')}
          {field(<MessageCircle className="w-3 h-3" />, 'Telegram', 'telegram', '@username')}
          {field(<MapPin className="w-3 h-3" />, 'Адрес проживания', 'address', 'Город, улица, дом', 'text', true)}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Сохранение...</> : saved ? <><CheckCircle className="w-4 h-4" />Сохранено!</> : <><Save className="w-4 h-4" />Сохранить</>}
        </Button>
      </div>
    </div>
  );
}