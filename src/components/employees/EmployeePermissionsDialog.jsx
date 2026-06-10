import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Save, Shield, Package, ShoppingCart, Warehouse, Users, CreditCard, RotateCcw, TrendingUp, History, Settings, LayoutDashboard, FileDown, Percent, ArrowLeftRight, RotateCw, Copy, Check, Upload, Tag, Bot, FileText, BarChart2, Bell, Trash2 } from 'lucide-react';
import { mergePermissions } from '@/components/permissions/permissionsHelper';

const PERMISSION_GROUPS = [
  {
    label: 'Главная и аналитика',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    permissions: [
      { key: 'view_dashboard',        label: 'Видеть главную страницу',      desc: 'Доступ к дашборду с общей статистикой' },
      { key: 'view_analytics',        label: 'Видеть раздел аналитики',      desc: 'Раздел аналитики и статистики' },
      { key: 'view_revenue',          label: 'Видеть выручку',               desc: 'Суммы выручки от продаж в аналитике и дашборде' },
      { key: 'view_profit',           label: 'Видеть прибыль',               desc: 'Суммы прибыли в продажах и аналитике' },
      { key: 'view_stock_value',      label: 'Видеть стоимость склада',      desc: 'Общая стоимость товаров на складе' },
      { key: 'view_purchase_price',   label: 'Видеть цены закупки',          desc: 'Отображение цен закупки на товарах' },
      { key: 'view_employee_analytics', label: 'Видеть эффективность сотрудников', desc: 'Раздел "Эффективность" — статистика по сотрудникам' },
    ]
  },
  {
    label: 'Товары',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    permissions: [
      { key: 'view_products',              label: 'Просматривать товары',          desc: 'Видеть список товаров на складе' },
      { key: 'add_products',               label: 'Добавлять товары',              desc: 'Создавать новые товары' },
      { key: 'edit_products',              label: 'Редактировать товары',          desc: 'Изменять данные товаров (название, цена, кол-во)' },
      { key: 'delete_products',            label: 'Удалять товары',                desc: 'Удалять товары из системы' },
      { key: 'move_products',              label: 'Перемещать товары',             desc: 'Перемещать товары между складами' },
      { key: 'view_products_cost',         label: 'Видеть стоимость товара',       desc: 'Видеть суммарную закупочную стоимость товара' },
      { key: 'edit_product_purchase_price',label: 'Редактировать цену закупки',    desc: 'Изменять закупочную цену товара' },
      { key: 'edit_product_sale_price',    label: 'Редактировать цену продажи',    desc: 'Изменять розничную цену товара' },
    ]
  },
  {
    label: 'Продажи',
    icon: ShoppingCart,
    color: 'text-green-600',
    bg: 'bg-green-50',
    permissions: [
      { key: 'view_sales',               label: 'Просматривать продажи',           desc: 'Видеть историю всех продаж' },
      { key: 'view_own_sales_only',      label: 'Видеть только свои продажи',      desc: 'Может просматривать только продажи, которые сделал сам' },
      { key: 'add_sales',                label: 'Делать продажи',                  desc: 'Оформлять новые продажи' },
      { key: 'edit_sales',               label: 'Редактировать продажи',           desc: 'Изменять оформленные продажи' },
      { key: 'cancel_sales',             label: 'Отменять свои продажи',           desc: 'Отменять только собственные продажи' },
      { key: 'cancel_any_sale',          label: 'Отменять любые продажи',          desc: 'Отменять продажи любого сотрудника' },
      { key: 'manage_discounts',         label: 'Давать скидки',                   desc: 'Продавать ниже стандартной цены' },
      { key: 'edit_sale_price',          label: 'Изменять цену при продаже',       desc: 'Вводить произвольную цену при оформлении продажи' },
      { key: 'view_sale_profit',         label: 'Видеть прибыль по продаже',       desc: 'Видеть прибыль в карточке каждой продажи' },
      { key: 'view_sale_purchase_price', label: 'Видеть закупку по продаже',       desc: 'Видеть цену закупки в карточке продажи' },
      { key: 'view_sale_customer',       label: 'Видеть имя клиента в продажах',   desc: 'Видеть, кому была продажа (имя клиента)' },
    ]
  },
  {
    label: 'Склады',
    icon: Warehouse,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    permissions: [
      { key: 'view_warehouses',      label: 'Видеть склады',                 desc: 'Просматривать склады и товары в них' },
      { key: 'manage_warehouses',    label: 'Управлять складами',            desc: 'Добавлять, редактировать, удалять склады' },
      { key: 'view_warehouse_value', label: 'Видеть стоимость товаров склада', desc: 'Видеть суммарную стоимость товаров на каждом складе' },
      { key: 'view_warehouse_revenue', label: 'Видеть выручку склада',       desc: 'Видеть сумму выручки с продаж конкретного склада' },
    ]
  },
  {
    label: 'Клиенты',
    icon: Users,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    permissions: [
      { key: 'view_customers',     label: 'Видеть клиентов',              desc: 'Просматривать список клиентов' },
      { key: 'manage_customers',   label: 'Добавлять/редакт. клиентов',   desc: 'Добавлять и редактировать данные клиентов' },
      { key: 'delete_customers',   label: 'Удалять клиентов',             desc: 'Удалять клиентов из системы' },
      { key: 'view_customer_debt', label: 'Видеть долг клиента',          desc: 'Видеть суммы долга и платежей клиента' },
      { key: 'view_customer_contacts', label: 'Видеть контакты клиента',  desc: 'Видеть телефон, WhatsApp, Telegram, адрес клиента' },
    ]
  },
  {
    label: 'Долги',
    icon: CreditCard,
    color: 'text-red-600',
    bg: 'bg-red-50',
    permissions: [
      { key: 'view_debts',      label: 'Видеть раздел долгов',      desc: 'Просматривать раздел долгов клиентов' },
      { key: 'manage_debts',    label: 'Принимать оплату долгов',   desc: 'Регистрировать платежи по долгам' },
      { key: 'add_debt_manual', label: 'Добавлять долг вручную',    desc: 'Создавать долг без продажи товара' },
      { key: 'send_debt_reminders', label: 'Отправлять напоминания о долге', desc: 'Рассылать уведомления должникам через WhatsApp/Telegram' },
    ]
  },
  {
    label: 'Возвраты',
    icon: RotateCcw,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    permissions: [
      { key: 'view_returns',   label: 'Видеть возвраты',        desc: 'Просматривать раздел возвратов товаров' },
      { key: 'manage_returns', label: 'Оформлять возвраты',     desc: 'Создавать и управлять возвратами товаров' },
    ]
  },
  {
    label: 'Отчёты и история',
    icon: FileText,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    permissions: [
      { key: 'view_reports',         label: 'Видеть раздел «Отчёты»',    desc: 'Доступ к разделу отчётов и статистики' },
      { key: 'view_reports_detailed',label: 'Детальные отчёты',           desc: 'Видеть полную детализацию в отчётах (суммы, прибыль)' },
      { key: 'view_activity_log',    label: 'Видеть историю действий',   desc: 'Просматривать лог активности системы' },
      { key: 'export_reports',       label: 'Экспортировать отчёты',     desc: 'Скачивать данные в Excel/PDF' },
      { key: 'export_excel',         label: 'Экспорт в Excel',           desc: 'Выгружать данные в формате Excel таблиц' },
      { key: 'delete_activity_log',  label: 'Удалять записи из истории', desc: 'Удалять или восстанавливать записи в истории действий' },
    ]
  },
  {
    label: 'AI Ассистент',
    icon: Bot,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    permissions: [
      { key: 'view_ai_assistant', label: 'Использовать AI Ассистент', desc: 'Доступ к разделу AI — анализ бизнеса, вопросы и ответы' },
    ]
  },
  {
    label: 'Уведомления',
    icon: Bell,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    permissions: [
      { key: 'manage_telegram',       label: 'Настройка Telegram уведомлений', desc: 'Изменять Telegram Chat ID и настройки уведомлений' },
      { key: 'send_notifications',    label: 'Отправлять уведомления',         desc: 'Отправлять любые уведомления клиентам' },
    ]
  },
  {
    label: 'Настройки и управление',
    icon: Settings,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    permissions: [
      { key: 'view_settings_language',   label: 'Менять язык интерфейса',            desc: 'Изменять язык интерфейса в настройках' },
      { key: 'view_settings_defaults',   label: 'Просматривать настройки по умол.',  desc: 'Видеть настройки товаров по умолчанию (размеры, цвета)' },
      { key: 'manage_settings_defaults', label: 'Изменять настройки по умол.',       desc: 'Изменять размеры, цвета, типы товаров по умолчанию' },
      { key: 'view_settings_custom',     label: 'Просматривать кастомные поля',      desc: 'Видеть пользовательские цвета и типы товаров' },
      { key: 'manage_settings_custom',   label: 'Управлять кастомными полями',       desc: 'Добавлять/удалять пользовательские цвета и типы' },
      { key: 'view_settings_security',   label: 'Просматривать безопасность',        desc: 'Видеть раздел резервных копий и безопасности' },
      { key: 'manage_settings',          label: 'Полные настройки бизнеса',          desc: 'Полный доступ: название, телефон, адрес бизнеса' },
      { key: 'view_settings_codes',      label: 'Видеть коды доступа',               desc: 'Просматривать коды входа в бизнес' },
      { key: 'manage_employees',         label: 'Управлять сотрудниками',            desc: 'Добавлять, редактировать и удалять сотрудников' },
      { key: 'manage_roles',             label: 'Управлять ролями',                  desc: 'Создавать и редактировать роли сотрудников' },
      { key: 'backup_data',              label: 'Делать резервные копии',            desc: 'Экспортировать данные бизнеса на Google Drive или Excel' },
      { key: 'delete_all_data',          label: 'Удалять все данные бизнеса',        desc: 'Опасное действие: очистка всех данных бизнеса' },
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

  useEffect(() => {
    const bid = businessId || employee?.business_id;
    if (bid) {
      base44.entities.Role.filter({ business_id: bid }).then(setRoles).catch(() => {});
    }
  }, [businessId, employee?.business_id]);

  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    if (roleId === 'none') {
      setPermissions({ ...(employee?.permissions || {}) });
      return;
    }
    const role = roles.find(r => r.id === roleId);
    if (role?.permissions) {
      setPermissions(mergePermissions(role.permissions, employee?.permissions || {}));
    }
  };

  const toggle = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generateNewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
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

  const handleRegenerateCode = () => setLoginCode(generateNewCode());

  const handleCopyCode = () => {
    navigator.clipboard.writeText(loginCode);
    setCopied('code');
    setTimeout(() => setCopied(''), 2000);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied('password');
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
    } finally {
      setUploading(false);
    }
  };

  const buildChangeHistory = async () => {
    const changes = [];
    const prev = employee;
    if (prev.is_frozen !== isFrozen) changes.push({ field: 'is_frozen', oldValue: String(prev.is_frozen ?? false), newValue: String(isFrozen) });
    if (prev.is_admin !== isAdmin) changes.push({ field: 'is_admin', oldValue: String(prev.is_admin ?? false), newValue: String(isAdmin) });
    const prevPerms = prev.permissions || {};
    const added = Object.keys(permissions).filter(k => permissions[k] && !prevPerms[k]);
    const removed = Object.keys(permissions).filter(k => !permissions[k] && prevPerms[k]);
    if (added.length > 0 || removed.length > 0) changes.push({ field: 'permissions', added, removed });
    return changes;
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
      const trimmedPassword = password.trim();
      if (trimmedPassword.length > 0) {
        const resp = await base44.functions.invoke('hashPassword', { password: trimmedPassword });
        const hash = resp?.data?.hash;
        if (!hash) throw new Error('Ошибка хеширования пароля');
        updateData.password = hash;
      }
      const changes = await buildChangeHistory();
      if (selectedRoleId !== (employee?.role_id || '')) {
        changes.push({ field: 'role_id', oldValue: String(employee?.role_id || ''), newValue: String(selectedRoleId || '') });
      }
      if (changes.length > 0) {
        const currentUser = await base44.auth.me();
        updateData.change_history = [...(employee.change_history || []), {
          timestamp: new Date().toISOString(),
          by_email: currentUser.email,
          changes,
        }];
      }
      await base44.entities.Employee.update(employee.id, updateData);
      await onSaved?.();
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      alert('❌ Ошибка при сохранении: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = (preset) => {
    if (preset === 'seller') {
      setIsAdmin(false);
      setPermissions({
        view_dashboard: true, view_analytics: false, view_revenue: false, view_profit: false, view_stock_value: false, view_purchase_price: false, view_employee_analytics: false,
        view_products: true, add_products: false, edit_products: false, delete_products: false, move_products: false, view_products_cost: false, edit_product_purchase_price: false, edit_product_sale_price: false,
        view_sales: true, view_own_sales_only: true, add_sales: true, edit_sales: false, cancel_sales: false, cancel_any_sale: false, manage_discounts: false, edit_sale_price: false, view_sale_profit: false, view_sale_purchase_price: false, view_sale_customer: true,
        view_warehouses: true, manage_warehouses: false, view_warehouse_value: false, view_warehouse_revenue: false,
        view_customers: true, manage_customers: false, delete_customers: false, view_customer_debt: false, view_customer_contacts: true,
        view_debts: false, manage_debts: false, add_debt_manual: false, send_debt_reminders: false,
        view_returns: false, manage_returns: false,
        view_reports: false, view_reports_detailed: false, view_activity_log: false, export_reports: false, export_excel: false, delete_activity_log: false,
        view_ai_assistant: false,
        manage_telegram: false, send_notifications: false,
        view_settings_language: true, manage_employees: false, manage_roles: false, manage_settings: false, view_settings_codes: false, backup_data: false, delete_all_data: false,
      });
    } else if (preset === 'manager') {
      setIsAdmin(false);
      setPermissions({
        view_dashboard: true, view_analytics: true, view_revenue: true, view_profit: false, view_stock_value: false, view_purchase_price: false, view_employee_analytics: false,
        view_products: true, add_products: true, edit_products: true, delete_products: false, move_products: true, view_products_cost: false, edit_product_purchase_price: false, edit_product_sale_price: true,
        view_sales: true, view_own_sales_only: false, add_sales: true, edit_sales: true, cancel_sales: true, cancel_any_sale: false, manage_discounts: true, edit_sale_price: true, view_sale_profit: false, view_sale_purchase_price: false, view_sale_customer: true,
        view_warehouses: true, manage_warehouses: false, view_warehouse_value: false, view_warehouse_revenue: true,
        view_customers: true, manage_customers: true, delete_customers: false, view_customer_debt: true, view_customer_contacts: true,
        view_debts: true, manage_debts: true, add_debt_manual: true, send_debt_reminders: true,
        view_returns: true, manage_returns: true,
        view_reports: true, view_reports_detailed: false, view_activity_log: false, export_reports: false, export_excel: false, delete_activity_log: false,
        view_ai_assistant: false,
        manage_telegram: false, send_notifications: true,
        view_settings_language: true, manage_employees: false, manage_roles: false, manage_settings: false, view_settings_codes: false, backup_data: false, delete_all_data: false,
      });
    } else if (preset === 'analyst') {
      setIsAdmin(false);
      setPermissions({
        view_dashboard: true, view_analytics: true, view_revenue: true, view_profit: true, view_stock_value: true, view_purchase_price: true, view_employee_analytics: true,
        view_products: true, add_products: false, edit_products: false, delete_products: false, move_products: false, view_products_cost: true, edit_product_purchase_price: false, edit_product_sale_price: false,
        view_sales: true, view_own_sales_only: false, add_sales: false, edit_sales: false, cancel_sales: false, cancel_any_sale: false, manage_discounts: false, edit_sale_price: false, view_sale_profit: true, view_sale_purchase_price: true, view_sale_customer: true,
        view_warehouses: true, manage_warehouses: false, view_warehouse_value: true, view_warehouse_revenue: true,
        view_customers: true, manage_customers: false, delete_customers: false, view_customer_debt: true, view_customer_contacts: false,
        view_debts: true, manage_debts: false, add_debt_manual: false, send_debt_reminders: false,
        view_returns: true, manage_returns: false,
        view_reports: true, view_reports_detailed: true, view_activity_log: true, export_reports: true, export_excel: true, delete_activity_log: false,
        view_ai_assistant: true,
        manage_telegram: false, send_notifications: false,
        view_settings_language: true, manage_employees: false, manage_roles: false, manage_settings: false, view_settings_codes: false, backup_data: false, delete_all_data: false,
      });
    } else if (preset === 'all') {
      setIsAdmin(true);
      const all = {};
      PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { all[p.key] = true; }));
      setPermissions(all);
    } else if (preset === 'none') {
      setIsAdmin(false);
      const none = {};
      PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { none[p.key] = false; }));
      setPermissions(none);
    }
  };

  // Фильтрованные группы по поиску
  const filteredGroups = searchPerm.trim()
    ? PERMISSION_GROUPS.map(g => ({
        ...g,
        permissions: g.permissions.filter(p =>
          p.label.toLowerCase().includes(searchPerm.toLowerCase()) ||
          p.desc.toLowerCase().includes(searchPerm.toLowerCase())
        )
      })).filter(g => g.permissions.length > 0)
    : PERMISSION_GROUPS;

  const totalPermissions = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.length, 0);
  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Разрешения: {employee?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Admin toggle */}
        <div className={`flex items-center justify-between p-3 rounded-xl border mb-3 ${isAdmin ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300' : 'bg-slate-50 border-slate-200'}`}>
          <div>
            <p className={`text-sm font-bold ${isAdmin ? 'text-indigo-700' : 'text-slate-700'}`}>
              {isAdmin ? '👑 Администратор — полный доступ' : '👤 Обычный сотрудник'}
            </p>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'Видит и управляет всем как владелец бизнеса' : `Включено ${enabledCount} из ${totalPermissions} разрешений`}
            </p>
          </div>
          <div
            onClick={() => setIsAdmin(a => !a)}
            className={`w-12 h-7 rounded-full transition-all flex items-center px-1 cursor-pointer ${isAdmin ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-slate-300'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isAdmin ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Freeze toggle */}
        <div className={`flex items-center justify-between p-3 rounded-xl border mb-4 ${isFrozen ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
          <div>
            <p className={`text-sm font-semibold ${isFrozen ? 'text-blue-800' : 'text-slate-700'}`}>
              {isFrozen ? '🧊 Аккаунт заморожен' : '✅ Аккаунт активен'}
            </p>
            <p className="text-xs text-slate-500">
              {isFrozen ? 'Сотрудник не может войти и использовать систему' : 'Сотрудник имеет доступ к системе'}
            </p>
          </div>
          <div
            onClick={() => setIsFrozen(f => !f)}
            className={`w-12 h-7 rounded-full transition-all flex items-center px-1 cursor-pointer ${isFrozen ? 'bg-blue-500' : 'bg-slate-300'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isFrozen ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center overflow-hidden">
            {employee?.avatar_url ? (
              <img src={employee.avatar_url} alt={employee?.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">{employee?.name?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>
          <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Загрузка...' : 'Загрузить фото'}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
          </label>
        </div>

        {/* Login code and password */}
        <div className="space-y-3 mb-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-900">🔑 Код входа</p>
            <div className="bg-white rounded-lg p-3 border border-indigo-100 flex items-center gap-2">
              <Input
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                className="font-mono font-bold text-lg tracking-widest flex-1"
                maxLength="8"
              />
              <button onClick={handleCopyCode} className="p-2 hover:bg-indigo-50 rounded">
                {copied === 'code' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-indigo-500" />}
              </button>
            </div>
            <Button onClick={handleRegenerateCode} variant="outline" size="sm" className="w-full gap-2">
              <RotateCw className="w-4 h-4" />
              Сгенерировать новый код
            </Button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-green-900">🔐 Пароль для входа</p>
            <div className="bg-white rounded-lg p-3 border border-green-100 flex items-center gap-2">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите новый пароль..."
                className="font-mono flex-1"
              />
              <button onClick={handleCopyPassword} className="p-2 hover:bg-green-50 rounded">
                {copied === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-green-600" />}
              </button>
            </div>
            <Button onClick={() => setPassword(generateStrongPassword())} variant="outline" size="sm" className="w-full gap-2">
              <RotateCw className="w-4 h-4" />
              Сгенерировать новый пароль
            </Button>
          </div>
        </div>

        {/* Role selector */}
        {roles.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-semibold text-purple-900">Роль сотрудника</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">Разрешения роли применяются как база. Переключатели ниже перекрывают их.</p>
            <Select value={selectedRoleId || 'none'} onValueChange={handleRoleChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Без роли" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Без роли (только персональные права)</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}{role.description ? ` — ${role.description}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Presets */}
        <div className="space-y-2 mb-4">
          <p className="text-sm text-slate-500">Быстрые пресеты:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handlePreset('seller')} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">
              🛍️ Продавец
            </button>
            <button onClick={() => handlePreset('manager')} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200">
              👔 Менеджер
            </button>
            <button onClick={() => handlePreset('analyst')} className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200">
              📊 Аналитик
            </button>
            <button onClick={() => handlePreset('all')} className="px-3 py-1 text-xs bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full hover:from-indigo-200 hover:to-purple-200 font-bold border border-indigo-300">
              👑 Администратор
            </button>
            <button onClick={() => handlePreset('none')} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200">
              🚫 Без прав
            </button>
          </div>
        </div>

        {/* Permission search */}
        <div className="relative mb-3">
          <input
            type="text"
            value={searchPerm}
            onChange={e => setSearchPerm(e.target.value)}
            placeholder="🔍 Поиск разрешения..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-slate-50"
          />
        </div>

        {/* Permissions list */}
        <div className="space-y-4">
          {isAdmin && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-300 rounded-xl p-4 mb-2">
              <p className="text-sm font-bold text-indigo-700 mb-1">👑 Администратор — по умолчанию имеет все права</p>
              <p className="text-xs text-slate-500">Вы можете выборочно отключить определённые разрешения для этого администратора ниже.</p>
            </div>
          )}
          {filteredGroups.map((group) => {
            const Icon = group.icon;
            // For admin: permission is ON unless explicitly disabled (key === false)
            const getEnabled = (key) => isAdmin ? (permissions[key] !== false) : !!permissions[key];
            const groupEnabled = group.permissions.filter(p => getEnabled(p.key)).length;
            return (
              <div key={group.label} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-2.5 ${group.bg}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${group.color}`} />
                    <span className={`text-sm font-semibold ${group.color}`}>{group.label}</span>
                  </div>
                  <span className="text-xs text-slate-500">{groupEnabled}/{group.permissions.length}</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {group.permissions.map((perm) => {
                    const enabled = getEnabled(perm.key);
                    return (
                      <div
                        key={perm.key}
                        onClick={() => {
                          if (isAdmin) {
                            // For admin: toggle means explicitly set false or remove restriction
                            setPermissions(prev => ({
                              ...prev,
                              [perm.key]: prev[perm.key] === false ? undefined : false
                            }));
                          } else {
                            toggle(perm.key);
                          }
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                          enabled
                            ? isAdmin ? 'bg-indigo-50 border border-indigo-200' : 'bg-indigo-50 border border-indigo-200'
                            : 'bg-red-50 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className={`text-sm font-medium ${enabled ? 'text-indigo-800' : 'text-red-700'}`}>
                            {perm.label}
                            {isAdmin && !enabled && <span className="ml-2 text-xs font-normal text-red-500">(отключено для этого админа)</span>}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{perm.desc}</p>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 flex-shrink-0 ${enabled ? 'bg-indigo-500' : 'bg-red-400'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Сохранение...' : <><Save className="w-4 h-4 mr-2" />Сохранить</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}