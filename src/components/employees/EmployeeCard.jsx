import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Shield, Trash2, Phone, Mail, Clock, LogIn, ChevronDown, ChevronUp, Copy, Send, History } from 'lucide-react';
import EmployeeHistoryDialog from './EmployeeHistoryDialog';

const PERM_LABELS = {
  view_dashboard: 'Дашборд', view_analytics: 'Аналитика', view_profit: 'Прибыль',
  view_stock_value: 'Стоимость склада', view_purchase_price: 'Цена закупки',
  view_products: 'Товары', add_products: '+ Товары', edit_products: 'Ред. товары',
  delete_products: 'Удал. товары', move_products: 'Перемещение',
  view_sales: 'Продажи', add_sales: '+ Продажи', edit_sales: 'Ред. продажи',
  cancel_sales: 'Отм. продажи', manage_discounts: 'Скидки',
  view_warehouses: 'Склады', manage_warehouses: 'Упр. склады',
  view_customers: 'Клиенты', manage_customers: 'Упр. клиенты',
  view_debts: 'Долги', manage_debts: 'Упр. долги',
  manage_returns: 'Возвраты', view_activity_log: 'История',
  export_reports: 'Экспорт', manage_employees: 'Сотрудники',
  manage_roles: 'Роли', manage_settings: 'Настройки',
  view_settings_defaults: 'Наст. по умол.', manage_settings_defaults: 'Изм. по умол.',
  view_settings_custom: 'Кастом. поля', manage_settings_custom: 'Упр. кастом.',
  view_settings_security: 'Безопасность', view_settings_codes: 'Коды доступа',
};

const ROLE_COLORS = {
  'Продавец': 'bg-blue-100 text-blue-700',
  'Менеджер': 'bg-green-100 text-green-700',
  'Кладовщик': 'bg-orange-100 text-orange-700',
  'Доставщик': 'bg-purple-100 text-purple-700',
};

function getOnlineStatus(lastLoginAt) {
  if (!lastLoginAt) return { label: 'Не входил', color: 'bg-slate-300', textColor: 'text-slate-500' };
  const diff = Date.now() - new Date(lastLoginAt).getTime();
  const mins = diff / 60000;
  // Онлайн если активен в течение 10 минут (heartbeat каждые 5 мин)
  if (mins < 10) return { label: 'В сети', color: 'bg-emerald-400', textColor: 'text-emerald-600', pulse: true };
  if (mins < 60) return { label: `${Math.round(mins)} мин. назад`, color: 'bg-yellow-400', textColor: 'text-yellow-600' };
  if (mins < 1440) return { label: formatDistanceToNow(new Date(lastLoginAt), { addSuffix: true, locale: dateFnsRu }), color: 'bg-slate-400', textColor: 'text-slate-500' };
  return { label: formatDistanceToNow(new Date(lastLoginAt), { addSuffix: true, locale: dateFnsRu }), color: 'bg-slate-300', textColor: 'text-slate-400' };
}

export default function EmployeeCard({ employee, onEdit, onDelete, onViewDetails, business }) {
  const [expanded, setExpanded] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const status = getOnlineStatus(employee.last_login_at);
  const grantedPerms = Object.entries(employee.permissions || {}).filter(([, v]) => v);
  const enabledCount = grantedPerms.length;
  const roleColor = ROLE_COLORS[employee.role] || 'bg-slate-100 text-slate-700';

  const handleResendInviteEmail = async () => {
    setSendingEmail(true);
    try {
      const newPassword = prompt('🔑 Введите новый пароль для отправки в письме (или отмена):');
      if (!newPassword) {
        setSendingEmail(false);
        return;
      }

      // Сначала отправляем письмо с открытым паролем
      await base44.functions.invoke('sendEmployeeInviteEmail', {
        email: employee.user_email,
        employeeName: employee.name,
        businessName: business?.name || 'BarakatCRM',
        permissions: employee.permissions,
        roleId: employee.role_id,
        employeePassword: newPassword,
        loginCode: employee.login_session_token,
      });

      // Потом обновляем пароль в БД (хешируем)
      const { data: { hash } } = await base44.functions.invoke('hashPassword', { password: newPassword });
      await base44.entities.Employee.update(employee.id, { password: hash });

      alert('✅ Пароль обновлён и письмо отправлено на ' + employee.user_email);
    } catch (err) {
      console.error('Error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Неизвестная ошибка';
      alert('❌ Ошибка: ' + errorMsg);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${employee.is_frozen ? 'border-blue-200 opacity-75' : 'border-slate-200'}`}>
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar with online dot */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">
                {employee.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900 text-base leading-tight">{employee.name}</p>
              {employee.is_admin && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-xs font-bold">👑 Админ</span>
              )}
              {employee.is_frozen && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">🧊 Заморожен</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500 truncate">{employee.user_email}</p>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <p className="text-xs text-slate-500">{employee.phone}</p>
              </div>
            )}

            {/* Status + role row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>
                {employee.role || 'Без роли'}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs ${status.textColor}`}>
                <Clock className="w-3 h-3" />
                {status.label}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(employee)}
              className="p-2 hover:bg-indigo-50 rounded-xl transition-colors group"
              title="Настроить разрешения"
            >
              <Shield className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
            </button>
            <button
              onClick={handleResendInviteEmail}
              disabled={sendingEmail}
              className="p-2 hover:bg-green-50 rounded-xl transition-colors group disabled:opacity-50"
              title="Отправить письмо"
            >
              <Send className="w-4 h-4 text-green-400 group-hover:text-green-600" />
            </button>
            <button
              onClick={() => onDelete(employee.id)}
              className="p-2 hover:bg-red-50 rounded-xl transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Expand toggle */}
         <button
           onClick={() => onViewDetails ? onViewDetails(employee) : setExpanded(e => !e)}
           className="mt-3 w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-xs text-slate-500 font-medium"
         >
          <span>
            {employee.is_admin
              ? '✅ Полный доступ'
              : enabledCount > 0
                ? `${enabledCount} разрешений`
                : 'Нет разрешений'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded: detailed info */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
          {/* Login Credentials */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-indigo-800">🔑 Данные для входа</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-indigo-100">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-xs font-mono font-semibold text-slate-900 truncate">{employee.user_email}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(employee.user_email)}
                  className="p-1 hover:bg-indigo-50 rounded flex-shrink-0 ml-2"
                  title="Копировать"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                </button>
              </div>
              {employee.login_session_token && (
                <div className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-indigo-100">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Код входа</p>
                    <p className="text-xs font-mono font-bold text-indigo-700 tracking-widest">{employee.login_session_token}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(employee.login_session_token)}
                    className="p-1 hover:bg-indigo-50 rounded flex-shrink-0 ml-2"
                    title="Копировать"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Last login detail */}
          {employee.last_login_at ? (
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100">
              <LogIn className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Последний вход</p>
                <p className="text-sm font-semibold text-slate-800">
                  {format(new Date(employee.last_login_at), 'dd MMM yyyy, HH:mm', { locale: dateFnsRu })}
                </p>
                <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(employee.last_login_at), { addSuffix: true, locale: dateFnsRu })}</p>
              </div>
            </div>
           ) : (
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100">
              <LogIn className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <p className="text-sm text-slate-400 italic">Ещё не входил в систему</p>
            </div>
           )}

          {/* Permissions */}
          {!employee.is_admin && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Разрешения:</p>
              {enabledCount === 0 ? (
                <p className="text-xs text-slate-400 italic px-1">Нет разрешений — нажмите 🛡 для настройки</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {grantedPerms.map(([k]) => (
                    <span key={k} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
                      {PERM_LABELS[k] || k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}