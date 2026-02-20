import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Trash2, Edit2, Mail, Phone, User,
  Eye, EyeOff, ShoppingCart, Package, Warehouse,
  Users, CreditCard, BarChart2, Shield, Check, X,
  RotateCcw, ChevronDown, ChevronUp, Send, UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_PERMISSIONS = [
  { key: 'view_analytics',    label: 'Просматривать аналитику',   icon: BarChart2,   group: 'analytics' },
  { key: 'view_profit',       label: 'Видеть прибыль',            icon: BarChart2,   group: 'analytics' },
  { key: 'view_products',     label: 'Видеть товары',             icon: Package,     group: 'products' },
  { key: 'add_products',      label: 'Добавлять товары',          icon: Package,     group: 'products' },
  { key: 'edit_products',     label: 'Редактировать товары',      icon: Package,     group: 'products' },
  { key: 'delete_products',   label: 'Удалять товары',            icon: Package,     group: 'products' },
  { key: 'view_sales',        label: 'Видеть продажи',            icon: ShoppingCart,group: 'sales' },
  { key: 'add_sales',         label: 'Добавлять продажи',         icon: ShoppingCart,group: 'sales' },
  { key: 'edit_sales',        label: 'Редактировать продажи',     icon: ShoppingCart,group: 'sales' },
  { key: 'cancel_sales',      label: 'Отменять продажи',          icon: ShoppingCart,group: 'sales' },
  { key: 'view_warehouses',   label: 'Видеть склады',             icon: Warehouse,   group: 'warehouse' },
  { key: 'manage_warehouses', label: 'Управлять складами',        icon: Warehouse,   group: 'warehouse' },
  { key: 'view_customers',    label: 'Видеть клиентов',           icon: Users,       group: 'customers' },
  { key: 'manage_customers',  label: 'Управлять клиентами',       icon: Users,       group: 'customers' },
  { key: 'view_debts',        label: 'Видеть долги',              icon: CreditCard,  group: 'debts' },
  { key: 'manage_debts',      label: 'Управлять долгами',         icon: CreditCard,  group: 'debts' },
  { key: 'manage_returns',    label: 'Управлять возвратами',      icon: RotateCcw,   group: 'returns' },
  { key: 'view_activity_log', label: 'Видеть историю действий',   icon: Shield,      group: 'admin' },
  { key: 'manage_employees',  label: 'Управлять сотрудниками',    icon: Shield,      group: 'admin' },
];

const GROUPS = {
  analytics:  { label: 'Аналитика',   color: 'bg-purple-100 text-purple-700' },
  products:   { label: 'Товары',      color: 'bg-blue-100 text-blue-700' },
  sales:      { label: 'Продажи',     color: 'bg-green-100 text-green-700' },
  warehouse:  { label: 'Склады',      color: 'bg-orange-100 text-orange-700' },
  customers:  { label: 'Клиенты',     color: 'bg-pink-100 text-pink-700' },
  debts:      { label: 'Долги',       color: 'bg-red-100 text-red-700' },
  returns:    { label: 'Возвраты',    color: 'bg-yellow-100 text-yellow-700' },
  admin:      { label: 'Управление',  color: 'bg-slate-200 text-slate-700' },
};

const PRESETS = {
  seller: {
    label: 'Продавец',
    permissions: {
      view_analytics: false, view_profit: false,
      view_products: true,   add_products: true,    edit_products: false, delete_products: false,
      view_sales: true,      add_sales: true,        edit_sales: false,    cancel_sales: false,
      view_warehouses: true, manage_warehouses: false,
      view_customers: true,  manage_customers: false,
      view_debts: false,     manage_debts: false,
      manage_returns: false, view_activity_log: false, manage_employees: false,
    }
  },
  manager: {
    label: 'Менеджер',
    permissions: {
      view_analytics: true,  view_profit: false,
      view_products: true,   add_products: true,    edit_products: true,  delete_products: false,
      view_sales: true,      add_sales: true,        edit_sales: true,     cancel_sales: false,
      view_warehouses: true, manage_warehouses: false,
      view_customers: true,  manage_customers: true,
      view_debts: true,      manage_debts: true,
      manage_returns: true,  view_activity_log: false, manage_employees: false,
    }
  },
  admin: {
    label: 'Администратор',
    permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true]))
  }
};

function PermissionToggle({ permKey, label, icon: Icon, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
        value
          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
      )}
    >
      <div className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
        value ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300')}>
        {value && <Check className="w-3 h-3 text-white" />}
      </div>
      {label}
    </button>
  );
}

function EmployeeCard({ employee, business, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [perms, setPerms] = useState(employee.permissions || {});
  const [saving, setSaving] = useState(false);

  const handleSavePerms = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, { permissions: perms });
    onUpdate();
    setEditing(false);
    setSaving(false);
  };

  const handleToggleActive = async () => {
    await base44.entities.Employee.update(employee.id, { is_active: !employee.is_active });
    onUpdate();
  };

  const groupedPerms = ALL_PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const activeCount = ALL_PERMISSIONS.filter(p => perms[p.key]).length;

  return (
    <div className={cn('border rounded-xl overflow-hidden', employee.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60')}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0',
          employee.is_active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400')}>
          {employee.name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate">{employee.name}</p>
            {!employee.is_active && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Неактивен</span>
            )}
          </div>
          <p className="text-sm text-slate-500 truncate">{employee.user_email}</p>
          <p className="text-xs text-slate-400">{employee.role} · {activeCount} разрешений</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleToggleActive}
            className={cn('p-2 rounded-lg text-xs', employee.is_active ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600')}
            title={employee.is_active ? 'Деактивировать' : 'Активировать'}
          >
            {employee.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setExpanded(!expanded); setEditing(false); }}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(employee.id)}
            className="p-2 hover:bg-red-50 rounded-lg text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permissions panel */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Разрешения</p>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1 text-xs">
                <Edit2 className="w-3 h-3" /> Изменить
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setPerms(employee.permissions || {}); }} className="text-xs">Отмена</Button>
                <Button size="sm" onClick={handleSavePerms} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-xs gap-1">
                  {saving ? <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                  Сохранить
                </Button>
              </div>
            )}
          </div>

          {editing && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
              <span className="text-xs text-slate-500 self-center">Шаблон:</span>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button key={key} onClick={() => setPerms({ ...preset.permissions })}
                  className="px-3 py-1 text-xs rounded-lg border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition">
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {Object.entries(groupedPerms).map(([group, items]) => (
            <div key={group}>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', GROUPS[group]?.color)}>{GROUPS[group]?.label}</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {items.map(p => (
                  editing ? (
                    <PermissionToggle key={p.key} permKey={p.key} label={p.label} icon={p.icon} value={!!perms[p.key]} onChange={v => setPerms(prev => ({ ...prev, [p.key]: v }))} />
                  ) : (
                    <div key={p.key} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border',
                      (employee.permissions?.[p.key])
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-400')}>
                      {employee.permissions?.[p.key] ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {p.label}
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmployeeManager({ business, employees, onUpdate }) {
  const [addDialog, setAddDialog] = useState(false);
  const [step, setStep] = useState(1); // 1=info, 2=permissions
  const [form, setForm] = useState({
    name: '', user_email: '', phone: '', role: 'Продавец',
    permissions: { ...PRESETS.seller.permissions }
  });
  const [saving, setSaving] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const resetForm = () => {
    setForm({ name: '', user_email: '', phone: '', role: 'Продавец', permissions: { ...PRESETS.seller.permissions } });
    setStep(1);
    setInviteSent(false);
  };

  const handlePreset = (presetKey) => {
    setForm(f => ({ ...f, role: PRESETS[presetKey].label, permissions: { ...PRESETS[presetKey].permissions } }));
  };

  const handleAdd = async () => {
    if (!form.name || !form.user_email) return;
    setSaving(true);
    try {
      await base44.entities.Employee.create({
        name: form.name,
        user_email: form.user_email,
        phone: form.phone,
        role: form.role,
        permissions: form.permissions,
        business_id: business.id,
        role_id: 'custom',
        is_active: true,
      });

      // Приглашение по email
      try {
        await base44.integrations.Core.SendEmail({
          to: form.user_email,
          subject: `Приглашение в бизнес "${business.name}"`,
          body: `Здравствуйте, ${form.name}!\n\nВы были добавлены как "${form.role}" в бизнес "${business.name}" в системе BarakatCRM.\n\nВойдите в систему по адресу используя эту почту: ${form.user_email}\n\nВаши права доступа настроены владельцем бизнеса.\n\nС уважением,\n${business.name}`
        });
        setInviteSent(true);
      } catch (e) {
        console.error('Email error:', e);
      }

      onUpdate();
      setTimeout(() => { setAddDialog(false); resetForm(); }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Удалить этого сотрудника?')) {
      await base44.entities.Employee.delete(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{employees.length} сотрудник(ов)</p>
        <Button onClick={() => { setAddDialog(true); resetForm(); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" /> Добавить сотрудника
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {employees.map(emp => (
          <EmployeeCard key={emp.id} employee={emp} business={business} onDelete={handleDelete} onUpdate={onUpdate} />
        ))}
        {employees.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Сотрудники пока не добавлены</p>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={(v) => { setAddDialog(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" /> Добавить сотрудника
            </DialogTitle>
          </DialogHeader>

          {inviteSent ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-semibold text-slate-900">Сотрудник добавлен!</p>
              <p className="text-sm text-slate-500">Приглашение отправлено на <strong>{form.user_email}</strong></p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {[1, 2].map(s => (
                  <React.Fragment key={s}>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>
                      {s}
                    </div>
                    <span className={cn('text-xs', step >= s ? 'text-indigo-600 font-medium' : 'text-slate-400')}>
                      {s === 1 ? 'Информация' : 'Права доступа'}
                    </span>
                    {s < 2 && <div className="flex-1 h-px bg-slate-200" />}
                  </React.Fragment>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Имя сотрудника *</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Имя Фамилия" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} placeholder="email@example.com" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Телефон</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+992 XXX XX XX XX" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Роль / Должность</Label>
                      <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Продавец, Менеджер..." className="mt-1.5" />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Шаблон прав:</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <button key={key} onClick={() => handlePreset(key)}
                          className={cn('px-4 py-2 text-sm rounded-lg border font-medium transition',
                            form.role === preset.label
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50')}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Выберите шаблон — права можно настроить детально на следующем шаге</p>
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    disabled={!form.name || !form.user_email}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    Далее — Настроить права →
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
                    <span className="text-xs text-slate-500 self-center">Быстрый шаблон:</span>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <button key={key} onClick={() => setForm(f => ({ ...f, permissions: { ...preset.permissions } }))}
                        className="px-3 py-1 text-xs rounded-lg border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition">
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {Object.entries(ALL_PERMISSIONS.reduce((acc, p) => { if (!acc[p.group]) acc[p.group] = []; acc[p.group].push(p); return acc; }, {})).map(([group, items]) => (
                    <div key={group}>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', GROUPS[group]?.color)}>{GROUPS[group]?.label}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {items.map(p => (
                          <PermissionToggle key={p.key} permKey={p.key} label={p.label} icon={p.icon}
                            value={!!form.permissions[p.key]}
                            onChange={v => setForm(f => ({ ...f, permissions: { ...f.permissions, [p.key]: v } }))}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Назад</Button>
                    <Button onClick={handleAdd} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2">
                      {saving
                        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />}
                      Добавить и отправить приглашение
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}