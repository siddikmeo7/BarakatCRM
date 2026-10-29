import React from 'react';

const MODULE_LABELS = {
  Analytics: 'Аналитика',
  Products: 'Товары',
  Warehouses: 'Склады',
  Sales: 'Продажи',
  Returns: 'Возвраты',
  Customers: 'Клиенты',
  Reports: 'Отчёты',
  Expenses: 'Расходы',
  Salary: 'Зарплата',
  AIAssistant: 'AI Ассистент',
  EmployeeAnalytics: 'Эффективность',
  ConsignmentProducts: 'Чужие товары',
  OwnerPayments: 'Деньги владельцам',
  Settings: 'Настройки',
  Profile: 'Профиль',
  ActivityLog: 'История действий',
  UserProfile: 'Профиль пользователя',
  ChartSettings: 'Настройки графиков',
  AdvancedSettings: 'Расширенные настройки',
  WarehouseSalesHistory: 'История склада',
  ProductDetail: 'Карточка товара',
  BusinessAccess: 'Вход в бизнес',
};

export default function UsageByModule({ rows = [], days = 30 }) {
  const max = Math.max(1, ...rows.map(r => r.count || 0));
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">
        Использование разделов за {days} дн.
      </p>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Пока нет данных об использовании</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {rows.map(r => (
            <div key={r.module} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold text-foreground truncate">
                {MODULE_LABELS[r.module] || r.module}
              </span>
              <span className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, ((r.count || 0) / max) * 100)}%` }}
                />
              </span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}