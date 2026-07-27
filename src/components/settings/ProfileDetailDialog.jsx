import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import {
  Flame, Calendar, Clock, Shield, Building2, User as UserIcon, CheckCircle, XCircle,
  Activity, Smartphone, Mail, Phone, MapPin, Crown, TrendingUp
} from 'lucide-react';
import { computeStreak, getActivityCalendar, getTotalLoginDays } from '@/lib/loginTracker';

const PERMISSION_LABELS = [
  { key: 'view_dashboard', label: 'Дашборд', icon: '📊' },
  { key: 'view_analytics', label: 'Аналитика', icon: '📈' },
  { key: 'view_profit', label: 'Прибыль', icon: '💰' },
  { key: 'view_products', label: 'Товары', icon: '📦' },
  { key: 'add_products', label: 'Добавление товаров', icon: '➕' },
  { key: 'edit_products', label: 'Редактирование товаров', icon: '✏️' },
  { key: 'delete_products', label: 'Удаление товаров', icon: '🗑️' },
  { key: 'view_sales', label: 'Продажи', icon: '🛒' },
  { key: 'add_sales', label: 'Добавление продаж', icon: '➕' },
  { key: 'edit_sales', label: 'Редактирование продаж', icon: '✏️' },
  { key: 'cancel_sales', label: 'Отмена продаж', icon: '❌' },
  { key: 'view_customers', label: 'Клиенты', icon: '👥' },
  { key: 'manage_customers', label: 'Управление клиентами', icon: '⚙️' },
  { key: 'view_debts', label: 'Долги', icon: '💳' },
  { key: 'manage_debts', label: 'Управление долгами', icon: '⚙️' },
  { key: 'view_warehouses', label: 'Склады', icon: '🏢' },
  { key: 'view_reports', label: 'Отчёты', icon: '📋' },
  { key: 'view_activity_log', label: 'Журнал действий', icon: '📜' },
  { key: 'export_reports', label: 'Экспорт отчётов', icon: '📤' },
  { key: 'view_ai_assistant', label: 'ИИ-ассистент', icon: '🤖' },
  { key: 'manage_employees', label: 'Управление сотрудниками', icon: '👔' },
  { key: 'manage_settings', label: 'Настройки', icon: '⚙️' },
];

export default function ProfileDetailDialog({ open, onClose, user, currentEmployee, business }) {
  const { can, isOwner } = useEmployeeAccess();
  const [streak, setStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [calendar, setCalendar] = useState([]);

  useEffect(() => {
    if (open && user?.email) {
      setStreak(computeStreak(user.email));
      setTotalDays(getTotalLoginDays(user.email));
      setCalendar(getActivityCalendar(user.email, 30));
    }
  }, [open, user?.email]);

  const permissions = useMemo(() => {
    if (isOwner || currentEmployee?.is_admin) {
      return PERMISSION_LABELS.map(p => ({ ...p, granted: true }));
    }
    const merged = window.__barakatMergedPermissions || currentEmployee?.permissions || {};
    return PERMISSION_LABELS.map(p => ({ ...p, granted: can(p.key) }));
  }, [isOwner, currentEmployee, can]);

  const grantedCount = permissions.filter(p => p.granted).length;

  const lastLogin = currentEmployee?.last_login_at || user?.created_date;
  const deviceInfo = currentEmployee?.device_info || '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserIcon className="w-5 h-5 text-indigo-500" />
            Мой профиль
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* === STREAK HERO === */}
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Flame className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-4xl font-black">{streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} 🔥</p>
                <p className="text-sm text-white/80">подряд заходите в систему</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold">{totalDays}</p>
                <p className="text-xs text-white/70">всего дней</p>
              </div>
            </div>
          </div>

          {/* === PROFILE INFO === */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Личная информация</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={UserIcon} label="Имя" value={currentEmployee?.name || user?.full_name || '—'} />
              <InfoRow icon={Mail} label="Email" value={user?.email || '—'} />
              <InfoRow icon={Phone} label="Телефон" value={currentEmployee?.phone || '—'} />
              <InfoRow icon={Crown} label="Роль" value={!currentEmployee ? '👑 Владелец' : currentEmployee.is_admin ? '🛡️ Администратор' : '👤 Сотрудник'} />
              <InfoRow icon={Calendar} label="В системе с" value={user?.created_date ? format(new Date(user.created_date), 'dd MMM yyyy') : '—'} />
              <InfoRow icon={Clock} label="Последний вход" value={lastLogin ? format(new Date(lastLogin), 'dd MMM yyyy, HH:mm') : '—'} />
            </div>
            {deviceInfo && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Устройство</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 break-all">{deviceInfo}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === BUSINESS INFO === */}
          {business && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Информация о бизнесе</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={Building2} label="Название" value={business.name || '—'} />
                <InfoRow icon={Phone} label="Телефон" value={business.phone || '—'} />
                <InfoRow icon={MapPin} label="Адрес" value={business.address || '—'} />
                <InfoRow icon={Activity} label="Статус" value={business.is_active ? '✅ Активен' : '❌ Неактивен'} />
              </div>
            </div>
          )}

          {/* === PERMISSIONS === */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Разрешения</h3>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
                {grantedCount} / {permissions.length}
              </span>
            </div>
            {(isOwner || currentEmployee?.is_admin) && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  {isOwner ? '✅ Полный доступ владельца — все разрешения активны' : '✅ Полный доступ администратора — все разрешения активны'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {permissions.map(p => (
                <div key={p.key} className={`flex items-center gap-2 p-2 rounded-lg ${p.granted ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                  {p.granted
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                  <span className={`text-xs truncate ${p.granted ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    {p.icon} {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* === ACTIVITY CALENDAR === */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Активность за 30 дней</h3>
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-slate-400 pb-1">{d}</div>
              ))}
              {calendar.map((day, i) => {
                const dayOfWeek = new Date(day.date).getDay();
                const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const isFirst = i === 0;
                return (
                  <React.Fragment key={day.date}>
                    {isFirst && offset > 0 && Array.from({ length: offset }).map((_, idx) => (
                      <div key={`empty-${idx}`} />
                    ))}
                    <div
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                        day.loggedIn
                          ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700/40 text-slate-400'
                      }`}
                      title={`${day.date} — ${day.loggedIn ? 'Был вход' : 'Нет входа'}`}
                    >
                      <span className="text-xs font-bold">{day.day}</span>
                      {day.loggedIn && <CheckCircle className="w-3 h-3 mt-0.5" />}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-green-500" />
                <span>Был вход</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-700/40" />
                <span>Нет входа</span>
              </div>
              <div className="ml-auto font-semibold text-slate-600 dark:text-slate-300">
                {calendar.filter(d => d.loggedIn).length} из {calendar.length} дней
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{value}</p>
      </div>
    </div>
  );
}