import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Check, X, Package, ShoppingCart, Users, Warehouse, CreditCard,
  BarChart2, Shield, RotateCcw, UserCheck, ChevronRight, Building2
} from 'lucide-react';

const PERM_LABELS = {
  view_analytics: { label: 'Просмотр аналитики', icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50' },
  view_profit: { label: 'Видеть прибыль', icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50' },
  view_products: { label: 'Просмотр товаров', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  add_products: { label: 'Добавлять товары', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  edit_products: { label: 'Редактировать товары', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  delete_products: { label: 'Удалять товары', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  view_sales: { label: 'Просмотр продаж', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
  add_sales: { label: 'Добавлять продажи', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
  edit_sales: { label: 'Редактировать продажи', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
  cancel_sales: { label: 'Отменять продажи', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
  view_warehouses: { label: 'Просмотр складов', icon: Warehouse, color: 'text-orange-600', bg: 'bg-orange-50' },
  manage_warehouses: { label: 'Управление складами', icon: Warehouse, color: 'text-orange-600', bg: 'bg-orange-50' },
  view_customers: { label: 'Просмотр клиентов', icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
  manage_customers: { label: 'Управление клиентами', icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
  view_debts: { label: 'Просмотр долгов', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
  manage_debts: { label: 'Управление долгами', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
  manage_returns: { label: 'Управление возвратами', icon: RotateCcw, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  view_activity_log: { label: 'История действий', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' },
  manage_employees: { label: 'Управление сотрудниками', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' },
};

export default function EmployeeWelcomeScreen({ employee, business, onContinue }) {
  const [user, setUser] = useState(null);
  const isAdmin = employee?.is_admin;

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
    // Обновляем время последнего входа
    if (employee?.id) {
      base44.entities.Employee.update(employee.id, { last_login_at: new Date().toISOString() }).catch(() => {});
    }
  }, [employee?.id]);

  const grantedPerms = isAdmin ? Object.entries(PERM_LABELS).map(([key]) => [key, true]) : Object.entries(employee?.permissions || {}).filter(([, v]) => v);
  const deniedPerms = isAdmin ? [] : Object.entries(employee?.permissions || {}).filter(([, v]) => !v);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring', damping: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-3xl text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Добро пожаловать!</p>
              <h2 className="text-xl font-bold">{employee?.name}</h2>
              <p className="text-white/80 text-sm">{employee?.role || 'Сотрудник'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl p-3">
            <Building2 className="w-4 h-4 text-white/70 flex-shrink-0" />
            <div>
              <p className="text-white/70 text-xs">Бизнес</p>
              <p className="text-white font-semibold text-sm">{business?.name}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-xl">👑</span>
              <div>
                <p className="text-white font-bold text-sm">Статус: Администратор</p>
                <p className="text-white/80 text-xs">Полный доступ ко всем функциям бизнеса</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Вы были добавлены с доступом:</p>
            <div className="grid grid-cols-2 gap-2">
              {grantedPerms.map(([key]) => {
                const info = PERM_LABELS[key];
                if (!info) return null;
                const Icon = info.icon;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * grantedPerms.indexOf([key, true]) }}
                    className={`flex items-center gap-2 p-2 rounded-xl ${info.bg} border border-white`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-white`}>
                      <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                    </div>
                    <span className={`text-xs font-medium ${info.color} leading-tight`}>{info.label}</span>
                    <Check className="w-3 h-3 text-emerald-500 ml-auto flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
            {grantedPerms.length === 0 && (
              <div className="text-center py-4 text-slate-400 text-sm">
                Разрешения ещё не настроены. Обратитесь к владельцу.
              </div>
            )}
          </div>

          {deniedPerms.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-2">Недоступно:</p>
              <div className="flex flex-wrap gap-1.5">
                {deniedPerms.filter(([key]) => PERM_LABELS[key]).map(([key]) => (
                  <span key={key} className="text-xs px-2 py-0.5 bg-white border border-slate-200 text-slate-400 rounded-lg flex items-center gap-1">
                    <X className="w-2.5 h-2.5" />
                    {PERM_LABELS[key]?.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800">
              💡 Если вам нужно больше прав доступа — обратитесь к владельцу бизнеса <strong>{business?.name}</strong>.
            </p>
          </div>

          <Button
            onClick={onContinue}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 h-11"
          >
            Войти в систему <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}