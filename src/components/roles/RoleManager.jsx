import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Edit2, Plus, Shield, Users, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    label: '📊 Дашборд и аналитика',
    color: 'indigo',
    perms: [
      { key: 'view_dashboard', label: 'Просмотр дашборда' },
      { key: 'view_analytics', label: 'Просмотр аналитики' },
      { key: 'view_profit', label: 'Просмотр прибыли' },
      { key: 'view_stock_value', label: 'Стоимость склада' },
      { key: 'view_purchase_price', label: 'Цена закупки' },
      { key: 'export_reports', label: 'Экспорт отчётов' },
    ],
  },
  {
    key: 'products',
    label: '📦 Товары',
    color: 'blue',
    perms: [
      { key: 'view_products', label: 'Просмотр товаров' },
      { key: 'add_products', label: 'Добавление товаров' },
      { key: 'edit_products', label: 'Редактирование товаров' },
      { key: 'delete_products', label: 'Удаление товаров' },
      { key: 'move_products', label: 'Перемещение товаров' },
    ],
  },
  {
    key: 'sales',
    label: '🛍️ Продажи',
    color: 'green',
    perms: [
      { key: 'view_sales', label: 'Просмотр продаж' },
      { key: 'add_sales', label: 'Создание продаж' },
      { key: 'edit_sales', label: 'Редактирование продаж' },
      { key: 'cancel_sales', label: 'Отмена продаж' },
      { key: 'manage_discounts', label: 'Управление скидками' },
      { key: 'manage_returns', label: 'Возвраты' },
    ],
  },
  {
    key: 'warehouses',
    label: '🏭 Склады',
    color: 'orange',
    perms: [
      { key: 'view_warehouses', label: 'Просмотр складов' },
      { key: 'manage_warehouses', label: 'Управление складами' },
    ],
  },
  {
    key: 'customers',
    label: '👥 Клиенты и долги',
    color: 'pink',
    perms: [
      { key: 'view_customers', label: 'Просмотр клиентов' },
      { key: 'manage_customers', label: 'Управление клиентами' },
      { key: 'view_debts', label: 'Просмотр долгов' },
      { key: 'manage_debts', label: 'Управление долгами' },
    ],
  },
  {
    key: 'admin',
    label: '⚙️ Администрирование',
    color: 'slate',
    perms: [
      { key: 'view_activity_log', label: 'История действий' },
      { key: 'manage_employees', label: 'Управление сотрудниками' },
      { key: 'manage_roles', label: 'Управление ролями' },
      { key: 'manage_settings', label: 'Настройки бизнеса' },
      { key: 'view_settings_codes', label: 'Просмотр кодов доступа' },
      { key: 'view_settings_security', label: 'Безопасность' },
    ],
  },
];

const GROUP_COLORS = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', header: 'bg-indigo-100', text: 'text-indigo-700', check: 'bg-indigo-600' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   header: 'bg-blue-100',   text: 'text-blue-700',   check: 'bg-blue-600' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  header: 'bg-green-100',  text: 'text-green-700',  check: 'bg-green-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-orange-100', text: 'text-orange-700', check: 'bg-orange-600' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   header: 'bg-pink-100',   text: 'text-pink-700',   check: 'bg-pink-600' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  header: 'bg-slate-100',  text: 'text-slate-700',  check: 'bg-slate-600' },
};

const PERM_LABEL_MAP = {};
PERMISSION_GROUPS.forEach(g => g.perms.forEach(p => { PERM_LABEL_MAP[p.key] = p.label; }));

function PermissionGroup({ group, permissions, onToggle }) {
  const [open, setOpen] = useState(true);
  const c = GROUP_COLORS[group.color];
  const checkedCount = group.perms.filter(p => permissions[p.key]).length;
  const allChecked = checkedCount === group.perms.length;

  const toggleAll = () => {
    const next = !allChecked;
    group.perms.forEach(p => {
      if (permissions[p.key] !== next) onToggle(p.key);
    });
  };

  return (
    <div className={cn('rounded-xl border overflow-hidden', c.border)}>
      <div className={cn('flex items-center justify-between px-4 py-2.5 cursor-pointer select-none', c.header)} onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{group.label}</span>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full bg-white/70', c.text)}>
            {checkedCount}/{group.perms.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); toggleAll(); }}
            className={cn('text-xs px-2 py-0.5 rounded-lg border font-medium transition-colors', allChecked ? 'bg-white border-current' : 'bg-white border-slate-200 text-slate-500 hover:border-current', c.text)}
          >
            {allChecked ? 'Снять всё' : 'Выбрать всё'}
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {open && (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-1 p-3', c.bg)}>
          {group.perms.map(perm => (
            <button
              key={perm.key}
              type="button"
              onClick={() => onToggle(perm.key)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                permissions[perm.key]
                  ? cn('bg-white border-current font-medium', c.text)
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              )}
            >
              <div className={cn('w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                permissions[perm.key] ? c.check : 'bg-slate-200'
              )}>
                {permissions[perm.key] && <Check className="w-3 h-3 text-white" />}
              </div>
              {perm.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoleManager({ businessId }) {
  const [roles, setRoles] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: {} });

  useEffect(() => { loadRoles(); }, [businessId]);

  const loadRoles = async () => {
    setLoading(true);
    const data = await base44.entities.Role.filter({ business_id: businessId });
    setRoles(data);
    setLoading(false);
  };

  const emptyPerms = () => {
    const p = {};
    PERMISSION_GROUPS.forEach(g => g.perms.forEach(perm => { p[perm.key] = false; }));
    return p;
  };

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: emptyPerms() });
    setShowDialog(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: { ...emptyPerms(), ...(role.permissions || {}) },
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    if (editingRole) {
      await base44.entities.Role.update(editingRole.id, { name: formData.name, description: formData.description, permissions: formData.permissions });
    } else {
      await base44.entities.Role.create({ business_id: businessId, name: formData.name, description: formData.description, permissions: formData.permissions });
    }
    setSaving(false);
    setShowDialog(false);
    loadRoles();
  };

  const handleDelete = async (roleId) => {
    if (!confirm('Удалить эту роль?')) return;
    await base44.entities.Role.delete(roleId);
    loadRoles();
  };

  const togglePermission = (key) => {
    setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));
  };

  if (loading) return <div className="py-8 text-center text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Роли сотрудников</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{roles.length}</span>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          Новая роль
        </Button>
      </div>

      {roles.length === 0 && (
        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <Shield className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-3">Нет пользовательских ролей</p>
          <Button onClick={openCreate} size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Создать первую роль
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {roles.map(role => {
          const grantedPerms = Object.entries(role.permissions || {}).filter(([, v]) => v);
          return (
            <div key={role.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <h4 className="font-semibold text-slate-900 truncate">{role.name}</h4>
                    <span className="text-xs text-slate-400 flex-shrink-0">{grantedPerms.length} прав</span>
                  </div>
                  {role.description && <p className="text-xs text-slate-500 mb-2">{role.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {grantedPerms.slice(0, 8).map(([k]) => (
                      <span key={k} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg">
                        {PERM_LABEL_MAP[k] || k}
                      </span>
                    ))}
                    {grantedPerms.length > 8 && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">+{grantedPerms.length - 8} ещё</span>
                    )}
                    {grantedPerms.length === 0 && <span className="text-xs text-slate-400 italic">Нет прав</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(role)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(role.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-white font-bold text-lg">
              {editingRole ? `Редактировать роль: ${editingRole.name}` : 'Создать новую роль'}
            </DialogTitle>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Название роли *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Старший продавец"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Описание</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-slate-700">Права доступа</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    const all = emptyPerms();
                    Object.keys(all).forEach(k => { all[k] = true; });
                    setFormData(p => ({ ...p, permissions: all }));
                  }} className="text-xs text-indigo-600 hover:underline">Выбрать всё</button>
                  <span className="text-slate-300">|</span>
                  <button type="button" onClick={() => setFormData(p => ({ ...p, permissions: emptyPerms() }))} className="text-xs text-slate-400 hover:underline">Снять всё</button>
                </div>
              </div>
              <div className="space-y-2">
                {PERMISSION_GROUPS.map(group => (
                  <PermissionGroup
                    key={group.key}
                    group={group}
                    permissions={formData.permissions}
                    onToggle={togglePermission}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving || !formData.name.trim()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                {saving ? '...' : editingRole ? 'Сохранить изменения' : 'Создать роль'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}