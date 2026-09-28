import React, { useState } from 'react';
import { format } from 'date-fns';
import { AvatarDisplay } from '@/components/settings/AvatarPicker';
import { base44 } from '@/api/base44Client';
import {
  Shield, CheckCircle, XCircle, Building2, Clock, Smartphone,
  Star, Lock, ChevronDown, ChevronUp
} from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

const ALL_PERM_LABELS = {
  view_analytics: '📈 Аналитика',
  view_profit: '💰 Прибыль',
  view_stock_value: '🏷️ Стоимость склада',
  view_purchase_price: '🏷️ Цены закупки',
  view_revenue: '💵 Выручка',
  view_employee_analytics: '👥 Эффективность',
  view_products: '📦 Просмотр товаров',
  add_products: '➕ Добавление товаров',
  edit_products: '✏️ Ред. товары',
  delete_products: '🗑️ Удаление товаров',
  move_products: '🔄 Перемещение товаров',
  view_products_cost: '💲 Себестоимость',
  view_sales: '🛒 Просмотр продаж',
  view_own_sales_only: '👁️ Только свои продажи',
  add_sales: '➕ Добавление продаж',
  edit_sales: '✏️ Ред. продажи',
  cancel_sales: '❌ Отмена продаж',
  cancel_any_sale: '❌ Отмена любых продаж',
  manage_discounts: '🏷️ Скидки',
  edit_sale_price: '💲 Изм. цену продажи',
  view_sale_profit: '💰 Прибыль с продажи',
  view_sale_customer: '👤 Клиент в продаже',
  view_warehouses: '🏭 Склады',
  manage_warehouses: '⚙️ Упр. складами',
  view_warehouse_value: '💎 Стоимость склада',
  view_warehouse_revenue: '📊 Выручка склада',
  view_customers: '👥 Клиенты',
  manage_customers: '⚙️ Упр. клиентами',
  delete_customers: '🗑️ Удаление клиентов',
  view_customer_debt: '💳 Долги клиентов',
  view_customer_contacts: '📞 Контакты клиентов',
  view_debts: '💳 Раздел долгов',
  manage_debts: '⚙️ Упр. долгами',
  add_debt_manual: '➕ Добавить долг',
  send_debt_reminders: '📨 Напоминания',
  manage_returns: '↩️ Возвраты',
  view_returns: '↩️ Просмотр возвратов',
  view_reports: '📋 Отчёты',
  view_activity_log: '📜 История',
  export_reports: '⬇️ Экспорт',
  export_excel: '📊 Экспорт Excel',
  manage_employees: '👤 Сотрудники',
  manage_roles: '🛡️ Роли',
  manage_settings: '⚙️ Настройки',
  view_settings_language: '🌐 Язык',
  view_settings_defaults: '⚙️ Параметры',
  manage_settings_defaults: '⚙️ Изм. параметры',
  view_settings_custom: '🎨 Кастомные поля',
  view_settings_security: '🔒 Безопасность',
  view_settings_codes: '🔑 Коды доступа',
  backup_data: '💾 Резервные копии',
  delete_all_data: '⚠️ Удаление данных',
  manage_telegram: '💬 Telegram',
  view_ai_assistant: '🤖 AI Ассистент',
};

export default function EmployeeProfilePanel({ employee, business, user, mergedPermissions }) {
  const [showAllPerms, setShowAllPerms] = useState(false);

  if (!employee || employee.is_admin) return null;

  const perms = mergedPermissions || employee.permissions || {};
  const grantedPerms = Object.entries(perms).filter(([, v]) => v === true);
  const visiblePerms = showAllPerms ? grantedPerms : grantedPerms.slice(0, 8);

  const lastLogin = employee.last_login_at ? new Date(employee.last_login_at) : null;
  const getDeviceLabel = (ua) => {
    if (!ua) return '—';
    const isMobile = /iPhone|Android.*Mobile/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    const device = isMobile ? '📱 Телефон' : isTablet ? '📱 Планшет' : '💻 Компьютер';
    const os = /iOS|iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : '';
    return `${device}${os ? ' · ' + os : ''}`;
  };

  return (
    <div className="space-y-3">
      {/* Карточка бизнеса + профиль сотрудника со стикером */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0 rounded-full bg-white/15 p-0.5">
            <EmployeeAvatar
              employee={employee}
              name={employee?.name}
              isAdmin={employee?.is_admin}
              sizeClass="w-12 h-12 text-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base truncate">{employee?.name || business?.name}</p>
            <p className="text-indigo-200 text-xs truncate">{business?.name} · Вы работаете здесь как сотрудник</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-green-300 font-medium flex-shrink-0 bg-white/10 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Активен
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-xl p-2.5">
            <p className="text-xs text-indigo-200 mb-0.5">Ваше имя</p>
            <p className="text-sm font-semibold text-white truncate">{employee.name}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <p className="text-xs text-indigo-200 mb-0.5">Статус</p>
            <p className="text-sm font-semibold text-white">
              {employee.is_frozen ? '🧊 Заморожен' : '✅ Активен'}
            </p>
          </div>
        </div>
      </div>

      {/* Информация о входе */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Активность</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Последний вход</span>
            <span className="text-xs font-semibold text-slate-800">
              {lastLogin ? format(lastLogin, 'dd.MM.yyyy HH:mm') : 'Нет данных'}
            </span>
          </div>
          {employee.device_info && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Устройство</span>
              <span className="text-xs font-semibold text-slate-800">{getDeviceLabel(employee.device_info)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Email</span>
            <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{employee.user_email}</span>
          </div>
        </div>
      </div>

      {/* Мои разрешения */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">Мои разрешения</span>
          </div>
          <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
            {grantedPerms.length} из {Object.keys(ALL_PERM_LABELS).length}
          </span>
        </div>
        <div className="p-4">
          {grantedPerms.length === 0 ? (
            <div className="text-center py-4">
              <Lock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Нет назначенных разрешений</p>
              <p className="text-xs text-slate-300 mt-1">Обратитесь к владельцу бизнеса</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {visiblePerms.map(([k]) => (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    {ALL_PERM_LABELS[k] || k}
                  </span>
                ))}
              </div>
              {grantedPerms.length > 8 && (
                <button
                  onClick={() => setShowAllPerms(v => !v)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                >
                  {showAllPerms ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Скрыть</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Показать ещё {grantedPerms.length - 8}</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}