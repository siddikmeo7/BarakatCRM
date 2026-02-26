import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Save, Shield, Package, ShoppingCart, Warehouse, Users, CreditCard, RotateCcw, TrendingUp, History, Settings, LayoutDashboard, FileDown, Percent, ArrowLeftRight, RotateCw, Copy, Check, Upload } from 'lucide-react';

const PERMISSION_GROUPS = [
  {
    label: 'Главная и аналитика',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    permissions: [
      { key: 'view_dashboard',      label: 'Видеть главную страницу',  desc: 'Доступ к дашборду с общей статистикой' },
      { key: 'view_analytics',      label: 'Видеть аналитику',          desc: 'Раздел аналитики и статистики' },
      { key: 'view_profit',         label: 'Видеть прибыль',            desc: 'Суммы прибыли в продажах и аналитике' },
      { key: 'view_stock_value',    label: 'Видеть стоимость товаров',  desc: 'Суммы стоимости склада и цены закупки' },
      { key: 'view_purchase_price', label: 'Видеть цены закупки',       desc: 'Отображение цен закупки на товарах' },
    ]
  },
  {
    label: 'Товары',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    permissions: [
      { key: 'view_products',   label: 'Просматривать товары',   desc: 'Видеть список товаров на складе' },
      { key: 'add_products',    label: 'Добавлять товары',        desc: 'Создавать новые товары' },
      { key: 'edit_products',   label: 'Редактировать товары',    desc: 'Изменять данные товаров' },
      { key: 'delete_products', label: 'Удалять товары',          desc: 'Удалять товары из системы' },
      { key: 'move_products',   label: 'Перемещать товары',       desc: 'Перемещать товары между складами' },
    ]
  },
  {
    label: 'Продажи',
    icon: ShoppingCart,
    color: 'text-green-600',
    bg: 'bg-green-50',
    permissions: [
      { key: 'view_sales',       label: 'Просматривать продажи',   desc: 'Видеть историю продаж' },
      { key: 'add_sales',        label: 'Делать продажи',           desc: 'Оформлять новые продажи' },
      { key: 'edit_sales',       label: 'Редактировать продажи',    desc: 'Изменять оформленные продажи' },
      { key: 'cancel_sales',     label: 'Отменять продажи',         desc: 'Отменять оформленные продажи' },
      { key: 'manage_discounts', label: 'Давать скидки',            desc: 'Изменять цену при продаже' },
    ]
  },
  {
    label: 'Склады',
    icon: Warehouse,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    permissions: [
      { key: 'view_warehouses',   label: 'Видеть склады',         desc: 'Просматривать склады и товары в них' },
      { key: 'manage_warehouses', label: 'Управлять складами',    desc: 'Добавлять, редактировать склады' },
    ]
  },
  {
    label: 'Клиенты',
    icon: Users,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    permissions: [
      { key: 'view_customers',   label: 'Видеть клиентов',        desc: 'Просматривать список клиентов' },
      { key: 'manage_customers', label: 'Управлять клиентами',    desc: 'Добавлять и редактировать клиентов' },
    ]
  },
  {
    label: 'Долги',
    icon: CreditCard,
    color: 'text-red-600',
    bg: 'bg-red-50',
    permissions: [
      { key: 'view_debts',   label: 'Видеть долги',        desc: 'Просматривать раздел долгов' },
      { key: 'manage_debts', label: 'Управлять долгами',   desc: 'Принимать оплату по долгам' },
    ]
  },
  {
    label: 'Возвраты',
    icon: RotateCcw,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    permissions: [
      { key: 'manage_returns', label: 'Управлять возвратами', desc: 'Оформлять возвраты товаров' },
    ]
  },
  {
    label: 'История и экспорт',
    icon: History,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    permissions: [
      { key: 'view_activity_log', label: 'Видеть историю действий', desc: 'Просматривать лог активности' },
      { key: 'export_reports',    label: 'Экспортировать отчёты',   desc: 'Скачивать данные в Excel/PDF' },
    ]
  },
  {
    label: 'Настройки и управление',
    icon: Settings,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    permissions: [
      { key: 'view_settings_language',  label: 'Менять язык интерфейса',         desc: 'Изменять язык интерфейса в настройках' },
      { key: 'view_settings_defaults',  label: 'Просматривать настройки по умол.', desc: 'Видеть настройки товаров по умолчанию (размеры, цвета)' },
      { key: 'manage_settings_defaults',label: 'Изменять настройки по умол.',    desc: 'Изменять размеры, цвета, типы товаров по умолчанию' },
      { key: 'view_settings_custom',    label: 'Просматривать кастомные поля',   desc: 'Видеть пользовательские цвета и типы товаров' },
      { key: 'manage_settings_custom',  label: 'Управлять кастомными полями',    desc: 'Добавлять/удалять пользовательские цвета и типы товаров' },
      { key: 'view_settings_security',  label: 'Просматривать безопасность',     desc: 'Видеть раздел резервных копий и безопасности' },
      { key: 'manage_settings',         label: 'Полные настройки бизнеса',       desc: 'Полный доступ: название, телефон, адрес бизнеса' },
      { key: 'view_settings_codes',     label: 'Видеть коды доступа',            desc: 'Просматривать коды входа в бизнес' },
      { key: 'manage_employees',        label: 'Управлять сотрудниками',         desc: 'Добавлять и удалять сотрудников' },
      { key: 'manage_roles',            label: 'Управлять ролями',               desc: 'Создавать и редактировать роли' },
    ]
  },
];

export default function EmployeePermissionsDialog({ employee, onClose, onSaved }) {
  const [permissions, setPermissions] = useState(() => ({ ...(employee?.permissions || {}) }));
  const [isFrozen, setIsFrozen] = useState(employee?.is_frozen || false);
  const [isAdmin, setIsAdmin] = useState(employee?.is_admin || false);
  const [saving, setSaving] = useState(false);
  const [loginCode, setLoginCode] = useState(employee?.login_session_token || '');
  const [password, setPassword] = useState(''); // Пустое — пользователь вводит новый пароль явно
  const [copied, setCopied] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleRegenerateCode = () => {
    const newCode = generateNewCode();
    setLoginCode(newCode);
  };

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = { 
        permissions: { ...permissions }, 
        is_frozen: isFrozen, 
        is_admin: isAdmin,
        login_session_token: loginCode,
      };

      // Если введён новый пароль — хешируем и сохраняем
      if (password && password.trim().length > 0) {
        const { data: { hash } } = await base44.functions.invoke('hashPassword', { password: password.trim() });
        updateData.password = hash;
      }

      await base44.entities.Employee.update(employee.id, updateData);
      await onSaved?.();
    } finally {
      setSaving(false);
      onClose();
    }
  };

  const handlePreset = (preset) => {
    if (preset === 'seller') {
      setIsAdmin(false);
      setPermissions({
        view_dashboard: true, view_analytics: false, view_profit: false, view_stock_value: false, view_purchase_price: false,
        view_products: true, add_products: false, edit_products: false, delete_products: false, move_products: false,
        view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, manage_discounts: false,
        view_warehouses: true, manage_warehouses: false,
        view_customers: true, manage_customers: false,
        view_debts: false, manage_debts: false,
        manage_returns: false, view_activity_log: false, export_reports: false,
        view_settings_language: true, manage_employees: false, manage_roles: false, manage_settings: false,
      });
    } else if (preset === 'manager') {
      setIsAdmin(false);
      setPermissions({
        view_dashboard: true, view_analytics: true, view_profit: false, view_stock_value: false, view_purchase_price: false,
        view_products: true, add_products: true, edit_products: true, delete_products: false, move_products: true,
        view_sales: true, add_sales: true, edit_sales: true, cancel_sales: false, manage_discounts: true,
        view_warehouses: true, manage_warehouses: false,
        view_customers: true, manage_customers: true,
        view_debts: true, manage_debts: true,
        manage_returns: true, view_activity_log: false, export_reports: false,
        view_settings_language: true, manage_employees: false, manage_roles: false, manage_settings: false,
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
              {isAdmin ? 'Видит и управляет всем как владелец бизнеса' : 'Права доступа настраиваются вручную ниже'}
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

        {/* Login code and password section */}
        <div className="space-y-3 mb-4">
          {/* Код входа */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-900">🔑 Код входа</p>
            <div className="bg-white rounded-lg p-3 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <Input 
                  value={loginCode} 
                  onChange={(e) => setLoginCode(e.target.value)} 
                  className="font-mono font-bold text-lg tracking-widest flex-1"
                  maxLength="8"
                />
                <button
                  onClick={handleCopyCode}
                  className="p-2 hover:bg-indigo-50 rounded ml-2"
                  title="Копировать"
                >
                  {copied === 'code' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-indigo-500" />
                  )}
                </button>
              </div>
            </div>
            <Button 
              onClick={handleRegenerateCode}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <RotateCw className="w-4 h-4" />
              Сгенерировать новый код
            </Button>
          </div>

          {/* Пароль для входа */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-green-900">🔐 Пароль для входа</p>
            <div className="bg-white rounded-lg p-3 border border-green-100 space-y-2">
              <div className="flex items-center justify-between">
                <Input 
                  type="text"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Введите новый пароль..."
                  className="font-mono flex-1"
                />
                <button
                  onClick={handleCopyPassword}
                  className="p-2 hover:bg-green-50 rounded ml-2"
                  title="Копировать"
                >
                  {copied === 'password' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-green-600" />
                  )}
                </button>
              </div>
            </div>
            <Button 
              onClick={() => setPassword(generateStrongPassword())}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <RotateCw className="w-4 h-4" />
              Сгенерировать новый пароль
            </Button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-sm text-slate-500">Быстрые пресеты:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handlePreset('seller')} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">
              🛍️ Продавец (базовый)
            </button>
            <button onClick={() => handlePreset('manager')} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200">
              👔 Менеджер (расширенный)
            </button>
            <button onClick={() => handlePreset('all')} className="px-3 py-1 text-xs bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full hover:from-indigo-200 hover:to-purple-200 font-bold border border-indigo-300">
              👑 Администратор (все права)
            </button>
            <button onClick={() => handlePreset('none')} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200">
              🚫 Без прав
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {isAdmin && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-300 rounded-xl p-5 text-center">
              <p className="text-lg font-bold text-indigo-700 mb-1">👑 Статус: Администратор</p>
              <p className="text-sm text-slate-600">Этот сотрудник имеет полный доступ ко всем функциям бизнеса, как владелец</p>
              <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
                {PERMISSION_GROUPS.map(g => (
                  <span key={g.label} className={cn('px-2 py-1 rounded-full font-medium', g.bg, g.color)}>
                    ✓ {g.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!isAdmin && PERMISSION_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.label} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`flex items-center gap-2 px-4 py-2.5 ${group.bg}`}>
                  <Icon className={`w-4 h-4 ${group.color}`} />
                  <span className={`text-sm font-semibold ${group.color}`}>{group.label}</span>
                </div>
                <div className="p-3 space-y-2">
                  {group.permissions.map((perm) => {
                    const enabled = !!permissions[perm.key];
                    return (
                      <div
                        key={perm.key}
                        onClick={() => toggle(perm.key)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                          enabled ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-medium ${enabled ? 'text-indigo-800' : 'text-slate-700'}`}>{perm.label}</p>
                          <p className="text-xs text-slate-500">{perm.desc}</p>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
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