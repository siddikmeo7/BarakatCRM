import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mergePermissions } from '@/components/permissions/permissionsHelper';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Trash2, Edit2, Mail, Phone, User,
  Eye, EyeOff, ShoppingCart, Package, Warehouse,
  Users, CreditCard, BarChart2, Shield, Check, X,
  RotateCcw, ChevronDown, ChevronUp, Send, UserCheck, Copy, LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MANAGER_PERMISSIONS } from '@/lib/defaultRoles';
import EmployeeDetailDialog from '../employees/EmployeeDetailDialog';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { toast } from '@/components/ui/use-toast';

const ALL_PERMISSIONS = [
  { key: 'view_dashboard',       label: 'Видеть главную',              icon: LayoutDashboard, group: 'main' },
  { key: 'view_analytics',       label: 'Просматривать аналитику',     icon: BarChart2,       group: 'analytics' },
  { key: 'view_profit',          label: 'Видеть прибыль',              icon: BarChart2,       group: 'analytics' },
  { key: 'view_stock_value',     label: 'Видеть стоимость товаров',    icon: Package,         group: 'analytics' },
  { key: 'view_purchase_price',  label: 'Видеть цены закупки',         icon: Package,         group: 'analytics' },
  { key: 'view_products',        label: 'Видеть товары',               icon: Package,         group: 'products' },
  { key: 'add_products',         label: 'Добавлять товары',            icon: Package,         group: 'products' },
  { key: 'edit_products',        label: 'Редактировать товары',        icon: Package,         group: 'products' },
  { key: 'delete_products',      label: 'Удалять товары',              icon: Package,         group: 'products' },
  { key: 'move_products',        label: 'Перемещать товары',           icon: Package,         group: 'products' },
  { key: 'view_sales',           label: 'Видеть продажи',              icon: ShoppingCart,    group: 'sales' },
  { key: 'add_sales',            label: 'Добавлять продажи',           icon: ShoppingCart,    group: 'sales' },
  { key: 'edit_sales',           label: 'Редактировать продажи',       icon: ShoppingCart,    group: 'sales' },
  { key: 'cancel_sales',         label: 'Отменять продажи',            icon: ShoppingCart,    group: 'sales' },
  { key: 'manage_discounts',     label: 'Давать скидки',               icon: ShoppingCart,    group: 'sales' },
  { key: 'view_warehouses',      label: 'Видеть склады',               icon: Warehouse,       group: 'warehouse' },
  { key: 'manage_warehouses',    label: 'Управлять складами',          icon: Warehouse,       group: 'warehouse' },
  { key: 'view_customers',       label: 'Видеть клиентов',             icon: Users,           group: 'customers' },
  { key: 'manage_customers',     label: 'Управлять клиентами',         icon: Users,           group: 'customers' },
  { key: 'view_debts',           label: 'Видеть долги',                icon: CreditCard,      group: 'debts' },
  { key: 'manage_debts',         label: 'Управлять долгами',           icon: CreditCard,      group: 'debts' },
  { key: 'manage_returns',       label: 'Управлять возвратами',        icon: RotateCcw,       group: 'returns' },
  { key: 'view_activity_log',    label: 'Видеть историю действий',     icon: Shield,          group: 'admin' },
  { key: 'export_reports',       label: 'Экспортировать отчёты',       icon: Shield,          group: 'admin' },
  { key: 'manage_employees',     label: 'Управлять сотрудниками',      icon: Shield,          group: 'admin' },
  { key: 'manage_roles',         label: 'Управлять ролями',            icon: Shield,          group: 'admin' },
  { key: 'manage_settings',      label: 'Управлять настройками',       icon: Shield,          group: 'admin' },
  { key: 'view_settings_language', label: 'Менять язык интерфейса',    icon: Shield,          group: 'admin' },
];

const GROUPS = {
  main:       { label: 'Главная',     color: 'bg-indigo-100 text-indigo-700' },
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
    label: '🛍️ Продавец',
    permissions: {
      view_dashboard: true, view_analytics: false, view_profit: false, view_stock_value: false, view_purchase_price: false,
      view_products: true, add_products: false, edit_products: false, delete_products: false, move_products: false,
      view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, manage_discounts: false,
      view_warehouses: true, manage_warehouses: false,
      view_customers: true, manage_customers: false,
      view_debts: false, manage_debts: false,
      manage_returns: false, view_activity_log: false, export_reports: false,
      manage_employees: false, manage_roles: false, manage_settings: false, view_settings_language: true,
    }
  },
  manager: {
    label: '👔 Менеджер',
    permissions: { ...MANAGER_PERMISSIONS },
  },
  admin: {
    label: '👑 Администратор',
    permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true]))
  },
  none: {
    label: '🚫 Без прав',
    permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false]))
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
  const [isAdmin, setIsAdmin] = useState(employee.is_admin || false);
  const [saving, setSaving] = useState(false);

  const handleSavePerms = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, { permissions: perms, is_admin: isAdmin });
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

  const activeCount = isAdmin ? ALL_PERMISSIONS.length : ALL_PERMISSIONS.filter(p => perms[p.key]).length;

  return (
    <div className={cn('border rounded-xl overflow-hidden', employee.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60')}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white">
        <div className="flex-shrink-0">
          <EmployeeAvatar employee={employee} sizeClass="w-10 h-10 text-base" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate">{employee.name}</p>
            {employee.is_admin && (
              <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-bold">👑 АДМИН</span>
            )}
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
          {/* Admin toggle */}
          {editing && (
            <div className={cn('flex items-center justify-between p-3 rounded-xl border mb-3',
              isAdmin ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300' : 'bg-white border-slate-200')}>
              <div>
                <p className={cn('text-sm font-bold', isAdmin ? 'text-indigo-700' : 'text-slate-700')}>
                  {isAdmin ? '👑 Администратор — полный доступ' : '👤 Обычный сотрудник'}
                </p>
                <p className="text-xs text-slate-500">
                  {isAdmin ? 'Видит и управляет всем как владелец бизнеса' : 'Права доступа настраиваются вручную'}
                </p>
              </div>
              <div
                onClick={() => setIsAdmin(a => !a)}
                className={cn('w-12 h-7 rounded-full transition-all flex items-center px-1 cursor-pointer',
                  isAdmin ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-slate-300')}>
                <div className={cn('w-5 h-5 rounded-full bg-white shadow transition-transform', isAdmin ? 'translate-x-5' : 'translate-x-0')} />
              </div>
            </div>
          )}
          {employee.is_admin && !editing && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-300 rounded-xl p-3 mb-3">
              <p className="text-sm font-bold text-indigo-700">👑 Администратор — полный доступ</p>
              <p className="text-xs text-slate-600">Этот сотрудник видит и управляет всем как владелец бизнеса</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Разрешения {isAdmin && editing ? '(отключены для админа)' : ''}</p>
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

          {editing && !isAdmin && (
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

          {!isAdmin && Object.entries(groupedPerms).map(([group, items]) => (
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
    name: '', user_email: '', phone: '', role: 'Продавец', password: '', loginCode: '',
    permissions: { ...PRESETS.seller.permissions },
    role_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [emailStatus, setEmailStatus] = useState('sending'); // 'sending' | 'sent' | 'failed'
  const [createdCode, setCreatedCode] = useState('');
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    if (business?.id) {
      base44.entities.Role.filter({ business_id: business.id }).then(setAvailableRoles).catch(() => {});
    }
  }, [business?.id]);

  const resetForm = () => {
    setForm({ name: '', user_email: '', phone: '', role: 'Продавец', password: '', loginCode: '', permissions: { ...PRESETS.seller.permissions }, role_id: '' });
    setStep(1);
    setInviteSent(false);
    setEmailStatus('sending');
    setCreatedCode('');
  };

  const generateStrongPassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const all = upper + lower + numbers + symbols;
    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = 0; i < 9; i++) pwd += all[Math.floor(Math.random() * all.length)];
    return pwd.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handlePreset = (presetKey) => {
    setForm(f => ({ ...f, role: PRESETS[presetKey].label, permissions: { ...PRESETS[presetKey].permissions } }));
  };

  const generateEmployeeCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleAdd = async () => {
    if (!form.name || !form.user_email || !form.password) return;
    setSaving(true);
    try {
      const finalCode = form.loginCode || generateEmployeeCode();
      setCreatedCode(finalCode);
      if (!form.loginCode) setForm(f => ({ ...f, loginCode: finalCode }));
      
      // СНАЧАЛА отправляем письмо с открытым паролем
      let emailDelivered = false;
      try {
        const res = await base44.functions.invoke('sendEmployeeInviteEmail', {
          email: form.user_email,
          employeeName: form.name,
          businessName: business.name,
          roleId: 'custom',
          permissions: form.permissions,
          employeePassword: form.password,
          loginCode: finalCode,
        });
        emailDelivered = !res?.data?.error;
        setEmailStatus(emailDelivered ? 'sent' : 'failed');
      } catch (e) {
        console.error('Error sending email:', e);
        setEmailStatus('failed');
      }

      // ПОТОМ хешируем пароль и создаём сотрудника
      const { data: { hash } } = await base44.functions.invoke('hashPassword', { password: form.password });
      
      const newEmp = await base44.entities.Employee.create({
        name: form.name,
        user_email: form.user_email.trim().toLowerCase(),
        phone: form.phone,
        role: form.role,
        password: hash,
        permissions: form.permissions,
        business_id: business.id,
        role_id: form.role_id || null,
        is_active: true,
        login_session_token: finalCode,
      });

      // Приглашаем пользователя в систему с email
      try { await base44.users.inviteUser(form.user_email, 'user'); } catch (e) {}

      setInviteSent(true);
      toast({
        title: emailDelivered ? 'Сотрудник зарегистрирован' : 'Сотрудник добавлен (письмо не доставлено)',
        description: emailDelivered
          ? `Приглашение отправлено на ${form.user_email}`
          : `Email не отправлен — передайте данные сотруднику вручную`,
        variant: emailDelivered ? 'default' : 'destructive',
      });
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Удалить этого сотрудника из команды? Его данные и история сохранятся и будут видны с пометкой «удалён».')) {
      // Soft-delete: сохраняем запись для исторических отображений, помечаем удалённым
      const emp = employees.find(e => e.id === id);
      const history = emp?.change_history || [];
      await base44.entities.Employee.update(id, {
        is_active: false,
        is_frozen: true,
        deleted_at: new Date().toISOString(),
        login_session_token: crypto.randomUUID(),
        change_history: [...history, { timestamp: new Date().toISOString(), by_email: business?.owner_email || '', changes: [{ field: 'deleted_at', oldValue: '', newValue: 'удалён' }] }],
      });
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{employees.filter(e => !e.deleted_at).length} сотрудник(ов)</p>
        <Button onClick={() => { setAddDialog(true); resetForm(); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" /> Добавить сотрудника
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {employees.filter(e => !e.deleted_at).map(emp => (
          <div key={emp.id} onClick={() => { setSelectedEmployee(emp); setDetailDialog(true); }} className="cursor-pointer">
            <EmployeeCard employee={emp} business={business} onDelete={handleDelete} onUpdate={onUpdate} />
          </div>
        ))}
        {employees.filter(e => !e.deleted_at).length === 0 && (
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
            <div className="py-4 space-y-4">
              <div className="text-center space-y-2">
                <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mx-auto',
                  emailStatus === 'sent' ? 'bg-green-100' : 'bg-amber-100')}>
                  {emailStatus === 'sent'
                    ? <Check className="w-7 h-7 text-green-600" />
                    : <Mail className="w-7 h-7 text-amber-600" />}
                </div>
                <p className="font-semibold text-slate-900">Сотрудник добавлен!</p>
              </div>
              <div className={cn('rounded-xl p-4 space-y-3 border',
                emailStatus === 'sent' ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200')}>
                <p className={cn('text-sm font-semibold', emailStatus === 'sent' ? 'text-indigo-800' : 'text-amber-800')}>
                  {emailStatus === 'sent' ? '📧 Приглашение отправлено:' : '⚠️ Письмо не доставлено:'}
                </p>
                {emailStatus !== 'sent' && (
                  <p className="text-xs text-amber-700">
                    Сервер не смог отправить email. Передайте данные сотруднику вручную (телефоном/мессенджером).
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400">Email сотрудника</p>
                      <p className="font-mono font-semibold text-slate-900 text-sm">{form.user_email}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(form.user_email); }} className="p-1.5 hover:bg-slate-50 rounded">
                      <Copy className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400">Пароль</p>
                      <p className="font-mono font-semibold text-slate-900 text-sm">{form.password}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(form.password); }} className="p-1.5 hover:bg-slate-50 rounded">
                      <Copy className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400">Код входа</p>
                      <p className="font-mono font-semibold text-slate-900 text-sm tracking-widest">{form.loginCode || createdCode || 'авто'}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(form.loginCode || createdCode || ''); }} className="p-1.5 hover:bg-slate-50 rounded">
                      <Copy className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {emailStatus === 'sent'
                    ? '✅ Сотрудник должен войти с этой почтой и своим паролем'
                    : 'Передайте сотруднику: почту, пароль и код входа'}
                </p>
              </div>
              <Button className="w-full" variant="outline" onClick={() => { setAddDialog(false); resetForm(); }}>Готово</Button>
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
                      <div className="flex items-center justify-between mb-1.5">
                        <Label>Пароль *</Label>
                        <button 
                          type="button"
                          onClick={() => setForm(f => ({ ...f, password: generateStrongPassword() }))}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          🔐 Генерировать
                        </button>
                      </div>
                      <Input type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Пароль для входа" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Код входа (опционально)</Label>
                      <Input value={form.loginCode || ''} onChange={e => setForm(f => ({ ...f, loginCode: e.target.value }))} placeholder="Оставить пусто для автогенерации" maxLength="8" className="mt-1.5 font-mono font-bold tracking-widest" />
                      <p className="text-xs text-slate-400 mt-1">Если не заполнить, будет автоматически сгенерирован</p>
                    </div>
                    <div>
                      <Label>Телефон</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+992 XXX XX XX XX" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Должность</Label>
                      <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Продавец, Менеджер..." className="mt-1.5" />
                    </div>
                    {availableRoles.length > 0 && (
                      <div className="sm:col-span-2">
                        <Label>Кастомная роль (опционально)</Label>
                        <Select
                          value={form.role_id || 'none'}
                          onValueChange={(val) => {
                            const rid = val === 'none' ? '' : val;
                            const role = availableRoles.find(r => r.id === rid);
                            setForm(f => ({
                              ...f,
                              role_id: rid,
                              permissions: role?.permissions ? mergePermissions(role.permissions, {}) : f.permissions,
                            }));
                          }}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Без роли" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Без роли (настроить вручную)</SelectItem>
                            {availableRoles.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 mt-1">Разрешения роли будут применены автоматически</p>
                      </div>
                    )}
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
                    disabled={!form.name || !form.user_email || !form.password}
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

        {/* Employee Detail Dialog */}
        <EmployeeDetailDialog 
         employee={selectedEmployee} 
         open={detailDialog} 
         onOpenChange={setDetailDialog}
         onUpdate={onUpdate}
        />
        </div>
        );
        }