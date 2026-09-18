import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { mergePermissions } from '@/components/permissions/permissionsHelper';
import { MANAGER_PERMISSIONS } from '@/lib/defaultRoles';
import { Save, Mail, CheckCheck, Zap, CheckSquare, Square } from 'lucide-react';

const PERMISSION_GROUPS = [
  {
    label: '📊 Аналитика и дашборд',
    permissions: [
      { key: 'view_dashboard',          label: 'Главная страница' },
      { key: 'view_analytics',          label: 'Раздел аналитики' },
      { key: 'view_revenue',            label: 'Видеть выручку' },
      { key: 'view_profit',             label: 'Видеть прибыль' },
      { key: 'view_stock_value',        label: 'Стоимость склада' },
      { key: 'view_purchase_price',     label: 'Цены закупки' },
      { key: 'view_employee_analytics', label: 'Эффективность сотрудников' },
    ]
  },
  {
    label: '📦 Товары',
    permissions: [
      { key: 'view_products',               label: 'Просматривать товары' },
      { key: 'add_products',                label: 'Добавлять товары' },
      { key: 'edit_products',               label: 'Редактировать товары' },
      { key: 'delete_products',             label: 'Удалять товары' },
      { key: 'move_products',               label: 'Перемещать между складами' },
      { key: 'view_products_cost',          label: 'Видеть стоимость товаров' },
      { key: 'edit_product_purchase_price', label: 'Редактировать цену закупки' },
      { key: 'edit_product_sale_price',     label: 'Редактировать цену продажи' },
    ]
  },
  {
    label: '🛒 Продажи',
    permissions: [
      { key: 'view_sales',               label: 'Просматривать продажи' },
      { key: 'view_own_sales_only',      label: 'Только свои продажи' },
      { key: 'add_sales',                label: 'Оформлять продажи' },
      { key: 'edit_sales',               label: 'Редактировать продажи' },
      { key: 'cancel_sales',             label: 'Отменять свои продажи' },
      { key: 'cancel_any_sale',          label: 'Отменять любые продажи' },
      { key: 'manage_discounts',         label: 'Давать скидки' },
      { key: 'edit_sale_price',          label: 'Изменять цену при продаже' },
      { key: 'view_sale_profit',         label: 'Видеть прибыль продаж' },
      { key: 'view_sale_purchase_price', label: 'Видеть закупочную цену' },
      { key: 'view_sale_customer',       label: 'Видеть клиента продажи' },
    ]
  },
  {
    label: '🏢 Склады',
    permissions: [
      { key: 'view_warehouses',        label: 'Видеть склады' },
      { key: 'manage_warehouses',      label: 'Управлять складами' },
      { key: 'view_warehouse_value',   label: 'Стоимость товаров на складе' },
      { key: 'view_warehouse_revenue', label: 'Выручка по складам' },
      { key: 'view_warehouse_cost',    label: 'Стоимость всех складов' },
      { key: 'view_warehouse_quantities', label: 'Количество товаров и коробок' },
    ]
  },
  {
    label: '👥 Клиенты',
    permissions: [
      { key: 'view_customers',         label: 'Видеть клиентов' },
      { key: 'manage_customers',       label: 'Добавлять и редактировать' },
      { key: 'delete_customers',       label: 'Удалять клиентов' },
      { key: 'view_customer_debt',     label: 'Видеть долг клиента' },
      { key: 'view_customer_contacts', label: 'Видеть контакты клиента' },
    ]
  },
  {
    label: '💳 Долги',
    permissions: [
      { key: 'view_debts',          label: 'Видеть долги' },
      { key: 'manage_debts',        label: 'Принимать оплату долгов' },
      { key: 'add_debt_manual',     label: 'Добавлять долг вручную' },
      { key: 'send_debt_reminders', label: 'Отправлять напоминания' },
    ]
  },
  {
    label: '💰 Расходы',
    permissions: [
      { key: 'view_expenses',     label: 'Просматривать расходы' },
      { key: 'view_all_expenses', label: 'Видеть все расходы (включая чужие)' },
      { key: 'manage_expenses',   label: 'Управлять всеми расходами' },
      { key: 'record_expenses_on_behalf', label: 'Фиксировать расходы от имени других лиц' },
    ]
  },
  {
    label: '↩️ Возвраты',
    permissions: [
      { key: 'view_returns',   label: 'Видеть возвраты' },
      { key: 'manage_returns', label: 'Оформлять возвраты' },
    ]
  },
  {
    label: '📋 Отчёты и история',
    permissions: [
      { key: 'view_reports',          label: 'Раздел отчётов' },
      { key: 'view_reports_detailed', label: 'Детальные отчёты' },
      { key: 'view_activity_log',     label: 'История действий' },
      { key: 'export_reports',        label: 'Экспорт отчётов (PDF/MD)' },
      { key: 'export_excel',          label: 'Экспорт в Excel' },
      { key: 'delete_activity_log',   label: 'Удалять историю' },
    ]
  },
  {
    label: '🤖 AI и уведомления',
    permissions: [
      { key: 'view_ai_assistant',  label: 'AI Ассистент' },
      { key: 'manage_telegram',    label: 'Настройки Telegram' },
      { key: 'send_notifications', label: 'Отправлять уведомления' },
    ]
  },
  {
    label: '⚙️ Настройки и управление',
    permissions: [
      { key: 'view_settings_language',    label: 'Язык интерфейса' },
      { key: 'view_settings_defaults',    label: 'Просмотр настроек' },
      { key: 'manage_settings_defaults',  label: 'Изменение настроек' },
      { key: 'view_settings_custom',     label: 'Кастомные поля' },
      { key: 'manage_settings_custom',   label: 'Управление кастомными полями' },
      { key: 'view_settings_security',   label: 'Безопасность' },
      { key: 'view_settings_codes',      label: 'Коды доступа' },
      { key: 'manage_settings',          label: 'Полные настройки' },
      { key: 'manage_employees',         label: 'Управление сотрудниками' },
      { key: 'manage_roles',             label: 'Управление ролями' },
      { key: 'backup_data',              label: 'Резервные копии' },
      { key: 'delete_all_data',          label: '⚠️ Удалить все данные' },
    ]
  },
];

export default function EmployeePermissionsDialog({ employee, onClose, onSaved, businessId }) {
  const [permissions, setPermissions] = useState(() => ({ ...(employee?.permissions || {}) }));
  const [isFrozen, setIsFrozen] = useState(employee?.is_frozen || false);
  const [isAdmin, setIsAdmin] = useState(employee?.is_admin || false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(employee?.role_id || '');

  useEffect(() => {
    const bid = businessId || employee?.business_id;
    if (bid) {
      base44.entities.Role.filter({ business_id: bid }).then(setRoles).catch(() => {});
    }
  }, [businessId, employee?.business_id]);

  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    if (roleId === 'none') { setPermissions({ ...(employee?.permissions || {}) }); return; }
    const role = roles.find(r => r.id === roleId);
    if (role?.permissions) setPermissions(mergePermissions(role.permissions, employee?.permissions || {}));
  };

  const toggle = (key) => {
    if (isAdmin) {
      // For admin: setting false = explicit deny; setting true (or undefined) = allow
      setPermissions(prev => {
        const updated = { ...prev };
        if (updated[key] === false) { delete updated[key]; } else { updated[key] = false; }
        return updated;
      });
    } else {
      setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const selectAllInGroup = (group) => {
    if (isAdmin) {
      // For admin, remove explicit false overrides (= allow all)
      setPermissions(prev => {
        const updated = { ...prev };
        group.permissions.forEach(p => { delete updated[p.key]; });
        return updated;
      });
    } else {
      setPermissions(prev => {
        const updated = { ...prev };
        group.permissions.forEach(p => { updated[p.key] = true; });
        return updated;
      });
    }
  };

  const deselectAllInGroup = (group) => {
    setPermissions(prev => {
      const updated = { ...prev };
      group.permissions.forEach(p => { updated[p.key] = false; });
      return updated;
    });
  };

  const giveAllPermissions = () => {
    setIsAdmin(false);
    const all = {};
    PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { all[p.key] = true; }));
    setPermissions(all);
  };

  const handlePreset = (preset) => {
    const none = {};
    PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { none[p.key] = false; }));
    if (preset === 'seller') {
      setIsAdmin(false);
      setPermissions({ ...none, view_dashboard: true, view_products: true, view_sales: true, view_own_sales_only: true, add_sales: true, view_warehouses: true, view_customers: true, view_customer_contacts: true, view_sale_customer: true, view_settings_language: true });
    } else if (preset === 'manager') {
      setIsAdmin(false);
      setPermissions({ ...none, ...MANAGER_PERMISSIONS });
    } else if (preset === 'analyst') {
      setIsAdmin(false);
      const all = {};
      PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { all[p.key] = true; }));
      setPermissions({ ...all, add_products: false, edit_products: false, delete_products: false, move_products: false, edit_product_purchase_price: false, edit_product_sale_price: false, add_sales: false, edit_sales: false, cancel_sales: false, cancel_any_sale: false, manage_discounts: false, edit_sale_price: false, manage_warehouses: false, manage_customers: false, delete_customers: false, manage_debts: false, add_debt_manual: false, send_debt_reminders: false, manage_returns: false, delete_activity_log: false, manage_telegram: false, manage_settings: false, manage_employees: false, manage_roles: false, delete_all_data: false });
    } else if (preset === 'none') {
      setIsAdmin(false);
      setPermissions(none);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        permissions: { ...permissions },
        is_frozen: isFrozen,
        is_admin: isAdmin,
        role_id: selectedRoleId || null,
      };
      const changes = [];
      if (employee.is_frozen !== isFrozen) changes.push({ field: 'is_frozen', oldValue: String(employee.is_frozen ?? false), newValue: String(isFrozen) });
      if (employee.is_admin !== isAdmin) changes.push({ field: 'is_admin', oldValue: String(employee.is_admin ?? false), newValue: String(isAdmin) });
      const prevPerms = employee.permissions || {};
      const added = Object.keys(permissions).filter(k => permissions[k] && !prevPerms[k]);
      const removed = Object.keys(permissions).filter(k => !permissions[k] && prevPerms[k]);
      if (added.length > 0 || removed.length > 0) changes.push({ field: 'permissions', added, removed });
      if (selectedRoleId !== (employee?.role_id || '')) changes.push({ field: 'role_id', oldValue: String(employee?.role_id || ''), newValue: String(selectedRoleId || '') });
      if (changes.length > 0) {
        const currentUser = await base44.auth.me();
        updateData.change_history = [...(employee.change_history || []), { timestamp: new Date().toISOString(), by_email: currentUser.email, changes }];
      }
      await base44.entities.Employee.update(employee.id, updateData);
      await onSaved?.();
      onClose();
    } catch (err) {
      alert('❌ Ошибка: ' + (err?.message || err));
    } finally { setSaving(false); }
  };

  const getEnabled = (key) => isAdmin ? (permissions[key] !== false) : !!permissions[key];
  const totalPermissions = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.length, 0);
  const enabledCount = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.filter(p => getEnabled(p.key)).length, 0);
  const isAllSelected = PERMISSION_GROUPS.every(g => g.permissions.every(p => getEnabled(p.key)));
  const toggleAllPermissions = () => {
    if (isAllSelected) {
      setIsAdmin(false);
      const none = {};
      PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { none[p.key] = false; }));
      setPermissions(none);
    } else {
      giveAllPermissions();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden flex flex-col [&>button:last-child]:hidden" style={{ maxHeight: '92vh' }}>
        {/* Header — employee info (READ ONLY) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">{employee?.full_name || employee?.name}</p>
            <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail className="w-3 h-3 flex-shrink-0" />{employee?.user_email}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Отмена</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              {saving ? '...' : <><Save className="w-3.5 h-3.5" />Сохранить</>}
            </Button>
          </div>
        </div>

        {/* Role picker — кто этот сотрудник */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Кто этот сотрудник?</p>
            <span className="text-xs text-slate-400">{enabledCount}/{totalPermissions}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Админ — отдельная карточка (тогглит is_admin) */}
            <button
              onClick={() => setIsAdmin(a => !a)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                isAdmin
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
              }`}
            >
              <span className="text-base">👑</span>
              <span className="text-xs font-bold">Админ</span>
            </button>
            {/* Роли из базы (складшик, менеджер и т.д.) */}
            {roles.length > 0 ? roles.map(role => {
              const active = !isAdmin && selectedRoleId === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => { if (isAdmin) setIsAdmin(false); handleRoleChange(role.id); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                    active
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-base">🛡️</span>
                  <span className="text-xs font-bold">{role.name}</span>
                </button>
              );
            }) : (
              <button
                onClick={() => {}}
                disabled
                className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs"
              >
                Нет ролей — создайте в «Роли»
              </button>
            )}
          </div>

          {/* Status toggles + presets */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200 dark:border-slate-700">
            <div onClick={() => setIsFrozen(f => !f)} className="flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${isFrozen ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${isFrozen ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className={`text-xs font-semibold ${isFrozen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>{isFrozen ? '🧊 Заморожен' : 'Активен'}</span>
            </div>
            <button
              onClick={toggleAllPermissions}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                isAllSelected
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
              }`}
            >
              {isAllSelected ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
              {isAllSelected ? 'Снять все' : 'Выбрать все'}
            </button>
            <button onClick={giveAllPermissions} className="text-xs px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:opacity-90 transition flex items-center gap-1 ml-auto">
              <Zap className="w-3 h-3" />Все разрешения
            </button>
            <button onClick={() => handlePreset('seller')} className="text-xs px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:opacity-80">🛍️ Продавец</button>
            <button onClick={() => handlePreset('manager')} className="text-xs px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:opacity-80">👔 Менеджер</button>
            <button onClick={() => handlePreset('analyst')} className="text-xs px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:opacity-80">📊 Аналитик</button>
            <button onClick={() => handlePreset('none')} className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:opacity-80">🚫 Без прав</button>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-700 px-4 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 flex-shrink-0">
            👑 Администратор имеет все права. Можно <strong>выборочно отключить</strong> конкретные разрешения тумблером.
          </div>
        )}

        {/* ALL PERMISSIONS — scrollable list, all sections visible */}
        <div className="flex-1 overflow-y-auto custom-scroll bg-white dark:bg-slate-900 p-3 space-y-3">
          {PERMISSION_GROUPS.map(group => {
            const allEnabled = group.permissions.every(p => getEnabled(p.key));
            const someEnabled = group.permissions.some(p => getEnabled(p.key));
            return (
              <div key={group.label} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Section header with Select All */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{group.label}</span>
                  <button
                    onClick={() => allEnabled ? deselectAllInGroup(group) : selectAllInGroup(group)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                      allEnabled
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
                    }`}
                  >
                    <CheckCheck className="w-3 h-3" />
                    {allEnabled ? 'Снять все' : 'Выбрать все'}
                  </button>
                </div>
                {/* Permissions grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                  {group.permissions.map(perm => {
                    const enabled = getEnabled(perm.key);
                    return (
                      <div
                        key={perm.key}
                        onClick={() => toggle(perm.key)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                          enabled
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                            : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/20'
                        }`}
                      >
                        <span className={`text-xs font-medium flex-1 ${enabled ? 'text-slate-800 dark:text-slate-200' : 'text-red-600 dark:text-red-400'}`}>
                          {perm.label}
                        </span>
                        <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ml-2 ${enabled ? 'bg-emerald-500' : 'bg-red-400'}`}>
                          <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}