import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Save, Shield, Package, ShoppingCart, Warehouse, Users, CreditCard, RotateCcw, TrendingUp, Settings, Bot, FileText, Bell, RotateCw, Copy, Check, Upload, Tag } from 'lucide-react';
import { mergePermissions } from '@/components/permissions/permissionsHelper';

const PERMISSION_GROUPS = [
  {
    label: 'Аналитика',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
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
    label: 'Товары',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    permissions: [
      { key: 'view_products',               label: 'Просматривать' },
      { key: 'add_products',                label: 'Добавлять' },
      { key: 'edit_products',               label: 'Редактировать' },
      { key: 'delete_products',             label: 'Удалять' },
      { key: 'move_products',               label: 'Перемещать' },
      { key: 'view_products_cost',          label: 'Видеть стоимость' },
      { key: 'edit_product_purchase_price', label: 'Ред. цену закупки' },
      { key: 'edit_product_sale_price',     label: 'Ред. цену продажи' },
    ]
  },
  {
    label: 'Продажи',
    icon: ShoppingCart,
    color: 'text-green-600',
    bg: 'bg-green-50',
    permissions: [
      { key: 'view_sales',               label: 'Просматривать' },
      { key: 'view_own_sales_only',      label: 'Только свои продажи' },
      { key: 'add_sales',                label: 'Делать продажи' },
      { key: 'edit_sales',               label: 'Редактировать' },
      { key: 'cancel_sales',             label: 'Отменять свои' },
      { key: 'cancel_any_sale',          label: 'Отменять любые' },
      { key: 'manage_discounts',         label: 'Давать скидки' },
      { key: 'edit_sale_price',          label: 'Изменять цену' },
      { key: 'view_sale_profit',         label: 'Видеть прибыль' },
      { key: 'view_sale_purchase_price', label: 'Видеть закупку' },
      { key: 'view_sale_customer',       label: 'Видеть клиента' },
    ]
  },
  {
    label: 'Склады',
    icon: Warehouse,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    permissions: [
      { key: 'view_warehouses',        label: 'Видеть склады' },
      { key: 'manage_warehouses',      label: 'Управлять складами' },
      { key: 'view_warehouse_value',   label: 'Стоимость товаров' },
      { key: 'view_warehouse_revenue', label: 'Выручка склада' },
    ]
  },
  {
    label: 'Клиенты',
    icon: Users,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    permissions: [
      { key: 'view_customers',         label: 'Видеть клиентов' },
      { key: 'manage_customers',       label: 'Добавлять/редакт.' },
      { key: 'delete_customers',       label: 'Удалять' },
      { key: 'view_customer_debt',     label: 'Видеть долг' },
      { key: 'view_customer_contacts', label: 'Видеть контакты' },
    ]
  },
  {
    label: 'Долги',
    icon: CreditCard,
    color: 'text-red-600',
    bg: 'bg-red-50',
    permissions: [
      { key: 'view_debts',          label: 'Видеть долги' },
      { key: 'manage_debts',        label: 'Принимать оплату' },
      { key: 'add_debt_manual',     label: 'Добавлять вручную' },
      { key: 'send_debt_reminders', label: 'Напоминания' },
    ]
  },
  {
    label: 'Возвраты',
    icon: RotateCcw,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    permissions: [
      { key: 'view_returns',   label: 'Видеть возвраты' },
      { key: 'manage_returns', label: 'Оформлять возвраты' },
    ]
  },
  {
    label: 'Отчёты',
    icon: FileText,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    permissions: [
      { key: 'view_reports',          label: 'Раздел отчётов' },
      { key: 'view_reports_detailed', label: 'Детальные отчёты' },
      { key: 'view_activity_log',     label: 'История действий' },
      { key: 'export_reports',        label: 'Экспорт отчётов' },
      { key: 'export_excel',          label: 'Экспорт Excel' },
      { key: 'delete_activity_log',   label: 'Удалять историю' },
    ]
  },
  {
    label: 'AI / Уведомл.',
    icon: Bot,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    permissions: [
      { key: 'view_ai_assistant',  label: 'AI Ассистент' },
      { key: 'manage_telegram',    label: 'Настройки Telegram' },
      { key: 'send_notifications', label: 'Отправлять уведомл.' },
    ]
  },
  {
    label: 'Настройки',
    icon: Settings,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    permissions: [
      { key: 'view_settings_language',   label: 'Язык интерфейса' },
      { key: 'view_settings_defaults',   label: 'Просм. настройки' },
      { key: 'manage_settings_defaults', label: 'Изм. настройки' },
      { key: 'view_settings_custom',     label: 'Кастомные поля' },
      { key: 'manage_settings_custom',   label: 'Упр. кастом. полями' },
      { key: 'view_settings_security',   label: 'Безопасность' },
      { key: 'manage_settings',          label: 'Полные настройки' },
      { key: 'view_settings_codes',      label: 'Коды доступа' },
      { key: 'manage_employees',         label: 'Упр. сотрудниками' },
      { key: 'manage_roles',             label: 'Упр. ролями' },
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
  const [loginCode, setLoginCode] = useState(employee?.login_session_token || '');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState('');
  const [uploading, setUploading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(employee?.role_id || '');
  const [searchPerm, setSearchPerm] = useState('');
  const [activeGroup, setActiveGroup] = useState(PERMISSION_GROUPS[0].label);
  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' | 'profile'

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

  const toggle = (key) => setPermissions(prev => ({ ...prev, [key]: !prev[key] }));

  const generateNewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const generateStrongPassword = () => {
    const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    return Array.from({ length: 12 }, () => all[Math.floor(Math.random() * all.length)]).join('');
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Employee.update(employee.id, { avatar_url: file_url });
      await onSaved?.();
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        permissions: { ...permissions },
        is_frozen: isFrozen,
        is_admin: isAdmin,
        login_session_token: loginCode,
        role_id: selectedRoleId || null,
      };
      if (password.trim()) {
        const resp = await base44.functions.invoke('hashPassword', { password: password.trim() });
        const hash = resp?.data?.hash;
        if (!hash) throw new Error('Ошибка хеширования пароля');
        updateData.password = hash;
      }
      // build change history
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

  const handlePreset = (preset) => {
    const none = {};
    PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { none[p.key] = false; }));
    if (preset === 'seller') {
      setIsAdmin(false);
      setPermissions({ ...none, view_dashboard: true, view_products: true, view_sales: true, view_own_sales_only: true, add_sales: true, view_warehouses: true, view_customers: true, view_customer_contacts: true, view_sale_customer: true, view_settings_language: true });
    } else if (preset === 'manager') {
      setIsAdmin(false);
      setPermissions({ ...none, view_dashboard: true, view_analytics: true, view_revenue: true, view_products: true, add_products: true, edit_products: true, move_products: true, edit_product_sale_price: true, view_sales: true, add_sales: true, edit_sales: true, cancel_sales: true, manage_discounts: true, edit_sale_price: true, view_sale_customer: true, view_warehouses: true, view_warehouse_revenue: true, view_customers: true, manage_customers: true, view_customer_debt: true, view_customer_contacts: true, view_debts: true, manage_debts: true, add_debt_manual: true, send_debt_reminders: true, view_returns: true, manage_returns: true, view_reports: true, send_notifications: true, view_settings_language: true });
    } else if (preset === 'analyst') {
      setIsAdmin(false);
      const all = {};
      PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { all[p.key] = true; }));
      setPermissions({ ...all, add_products: false, edit_products: false, delete_products: false, move_products: false, edit_product_purchase_price: false, edit_product_sale_price: false, add_sales: false, edit_sales: false, cancel_sales: false, cancel_any_sale: false, manage_discounts: false, edit_sale_price: false, manage_warehouses: false, manage_customers: false, delete_customers: false, manage_debts: false, add_debt_manual: false, send_debt_reminders: false, manage_returns: false, delete_activity_log: false, manage_telegram: false, manage_settings: false, manage_employees: false, manage_roles: false, delete_all_data: false });
    } else if (preset === 'all') {
      setIsAdmin(true);
      const all = {};
      PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { all[p.key] = true; }));
      setPermissions(all);
    } else if (preset === 'none') {
      setIsAdmin(false);
      setPermissions(none);
    }
  };

  const getEnabled = (key) => isAdmin ? (permissions[key] !== false) : !!permissions[key];
  const totalPermissions = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.length, 0);
  const enabledCount = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.filter(p => getEnabled(p.key)).length, 0);

  const filteredGroups = searchPerm.trim()
    ? PERMISSION_GROUPS.map(g => ({ ...g, permissions: g.permissions.filter(p => p.label.toLowerCase().includes(searchPerm.toLowerCase())) })).filter(g => g.permissions.length > 0)
    : PERMISSION_GROUPS;

  const currentGroup = filteredGroups.find(g => g.label === activeGroup) || filteredGroups[0];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden" style={{ maxHeight: '92vh', height: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
              {employee?.avatar_url
                ? <img src={employee.avatar_url} alt={employee?.name} className="w-full h-full object-cover" />
                : <span className="text-white text-sm font-bold">{employee?.name?.charAt(0)?.toUpperCase()}</span>
              }
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{employee?.name}</p>
              <p className="text-xs text-slate-400">{isAdmin ? '👑 Администратор' : `${enabledCount}/${totalPermissions} разрешений`}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? '...' : <><Save className="w-3.5 h-3.5 mr-1" />Сохранить</>}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'permissions' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🔐 Разрешения
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'}`}
          >
            👤 Профиль и доступ
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(92vh - 100px)' }}>
          {activeTab === 'permissions' ? (
            /* ── PERMISSIONS TAB ── */
            <>
              {/* Left: group list */}
              <div className="w-36 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                {/* Admin toggle */}
                <div
                  onClick={() => setIsAdmin(a => !a)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 cursor-pointer border-b ${isAdmin ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-white dark:bg-slate-800'} border-slate-200 dark:border-slate-700`}
                >
                  <div className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${isAdmin ? 'bg-indigo-500' : 'bg-slate-300'}`} style={{height:'18px',width:'32px'}}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${isAdmin ? 'translate-x-3.5' : 'translate-x-0'}`} />
                  </div>
                  <span className={`text-xs font-semibold truncate ${isAdmin ? 'text-indigo-700' : 'text-slate-500'}`}>{isAdmin ? '👑 Админ' : 'Обычный'}</span>
                </div>

                {/* Presets */}
                <div className="p-1.5 border-b border-slate-200 dark:border-slate-700 space-y-1">
                  {[
                    { key: 'seller', label: '🛍️ Продавец', color: 'text-blue-700 bg-blue-50' },
                    { key: 'manager', label: '👔 Менеджер', color: 'text-green-700 bg-green-50' },
                    { key: 'analyst', label: '📊 Аналитик', color: 'text-amber-700 bg-amber-50' },
                    { key: 'none', label: '🚫 Без прав', color: 'text-red-700 bg-red-50' },
                  ].map(p => (
                    <button key={p.key} onClick={() => handlePreset(p.key)} className={`w-full text-left px-2 py-1 text-xs rounded-lg ${p.color} hover:opacity-80 transition`}>
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Group list */}
                <div className="p-1">
                  {PERMISSION_GROUPS.map(g => {
                    const cnt = g.permissions.filter(p => getEnabled(p.key)).length;
                    const Icon = g.icon;
                    const isActive = activeGroup === g.label;
                    return (
                      <button
                        key={g.label}
                        onClick={() => setActiveGroup(g.label)}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all mb-0.5 ${isActive ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/70 dark:hover:bg-slate-800'}`}
                      >
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${g.color}`} />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{g.label}</span>
                        <span className={`text-[10px] font-bold rounded px-0.5 flex-shrink-0 ${cnt === g.permissions.length ? 'text-emerald-600' : cnt === 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {cnt}/{g.permissions.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: permissions for selected group */}
              <div className="flex-1 overflow-y-auto p-3 bg-white dark:bg-slate-900">
                {isAdmin && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl p-2.5 mb-3 text-xs text-indigo-700 dark:text-indigo-300">
                    👑 Администратор имеет все права. Ниже можно <strong>выборочно отключить</strong> конкретные разрешения.
                  </div>
                )}

                {/* Search */}
                <input
                  type="text"
                  value={searchPerm}
                  onChange={e => setSearchPerm(e.target.value)}
                  placeholder="🔍 Поиск..."
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mb-3 outline-none focus:border-indigo-400 bg-slate-50 dark:bg-slate-800 dark:border-slate-600"
                />

                {searchPerm.trim() ? (
                  /* Search results */
                  <div className="space-y-1">
                    {filteredGroups.map(g => g.permissions.map(perm => {
                      const enabled = getEnabled(perm.key);
                      return (
                        <PermToggle key={perm.key} perm={perm} enabled={enabled} isAdmin={isAdmin} groupColor={g.color}
                          onToggle={() => {
                            if (isAdmin) setPermissions(prev => ({ ...prev, [perm.key]: prev[perm.key] === false ? undefined : false }));
                            else toggle(perm.key);
                          }}
                        />
                      );
                    }))}
                  </div>
                ) : (
                  /* Current group */
                  currentGroup && (
                    <div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${currentGroup.bg}`}>
                        <currentGroup.icon className={`w-4 h-4 ${currentGroup.color}`} />
                        <span className={`text-sm font-semibold ${currentGroup.color}`}>{currentGroup.label}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          {currentGroup.permissions.filter(p => getEnabled(p.key)).length}/{currentGroup.permissions.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {currentGroup.permissions.map(perm => {
                          const enabled = getEnabled(perm.key);
                          return (
                            <PermToggle key={perm.key} perm={perm} enabled={enabled} isAdmin={isAdmin} groupColor={currentGroup.color}
                              onToggle={() => {
                                if (isAdmin) setPermissions(prev => ({ ...prev, [perm.key]: prev[perm.key] === false ? undefined : false }));
                                else toggle(perm.key);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            /* ── PROFILE TAB ── */
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900">
              {/* Avatar + freeze/admin */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {employee?.avatar_url
                    ? <img src={employee.avatar_url} alt={employee?.name} className="w-full h-full object-cover" />
                    : <span className="text-white text-xl font-bold">{employee?.name?.charAt(0)?.toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">{employee?.name}</p>
                  <p className="text-xs text-slate-400">{employee?.user_email}</p>
                  <label className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-100">
                    <Upload className="w-3 h-3" />{uploading ? 'Загрузка...' : 'Сменить фото'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                  </label>
                </div>
                <div className="space-y-2 flex-shrink-0">
                  <Toggle label="👑 Администратор" value={isAdmin} onChange={setIsAdmin} activeColor="bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <Toggle label="🧊 Заморожен" value={isFrozen} onChange={setIsFrozen} activeColor="bg-blue-500" />
                </div>
              </div>

              {/* Role */}
              {roles.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">Роль сотрудника</p>
                  </div>
                  <Select value={selectedRoleId || 'none'} onValueChange={handleRoleChange}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 h-8 text-xs">
                      <SelectValue placeholder="Без роли" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Без роли</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.name}{role.description ? ` — ${role.description}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Login code */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-3">
                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-2">🔑 Код входа</p>
                <div className="flex items-center gap-2">
                  <Input value={loginCode} onChange={e => setLoginCode(e.target.value)} className="font-mono font-bold tracking-widest h-8 text-sm flex-1" maxLength="8" />
                  <button onClick={() => handleCopy(loginCode, 'code')} className="p-1.5 hover:bg-indigo-100 rounded">
                    {copied === 'code' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
                  </button>
                  <button onClick={() => setLoginCode(generateNewCode())} className="p-1.5 hover:bg-indigo-100 rounded">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-900 dark:text-green-300 mb-2">🔐 Новый пароль</p>
                <div className="flex items-center gap-2">
                  <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Введите или сгенерируйте..." className="font-mono h-8 text-sm flex-1" />
                  <button onClick={() => handleCopy(password, 'password')} className="p-1.5 hover:bg-green-100 rounded">
                    {copied === 'password' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-green-600" />}
                  </button>
                  <button onClick={() => setPassword(generateStrongPassword())} className="p-1.5 hover:bg-green-100 rounded">
                    <RotateCw className="w-3.5 h-3.5 text-green-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermToggle({ perm, enabled, isAdmin, groupColor, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${enabled ? 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100'}`}
    >
      <span className={`text-xs font-medium flex-1 ${enabled ? 'text-slate-800 dark:text-slate-200' : 'text-red-700 dark:text-red-400'}`}>
        {perm.label}
        {isAdmin && !enabled && <span className="ml-1 text-[10px] text-red-400">(откл.)</span>}
      </span>
      <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ml-2 ${enabled ? 'bg-indigo-500' : 'bg-red-400'}`}>
        <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, activeColor }) {
  return (
    <div onClick={() => onChange(v => !v)} className="flex items-center gap-2 cursor-pointer">
      <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${value ? activeColor : 'bg-slate-300'}`}>
        <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <span className={`text-xs font-medium ${value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}