import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import { History, Shield, Snowflake, User, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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
};

function ChangeEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const changes = entry.changes || [];

  const getIcon = () => {
    if (changes.some(c => c.field === 'is_frozen')) return <Snowflake className="w-4 h-4 text-blue-500" />;
    if (changes.some(c => c.field === 'is_admin')) return <Shield className="w-4 h-4 text-indigo-500" />;
    if (changes.some(c => c.field === 'permissions')) return <Shield className="w-4 h-4 text-purple-500" />;
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const getSummary = () => {
    const parts = [];
    changes.forEach(c => {
      if (c.field === 'is_frozen') parts.push(c.newValue ? '🧊 Заморожен' : '✅ Разморожен');
      else if (c.field === 'is_admin') parts.push(c.newValue ? '👑 Стал администратором' : '👤 Снят статус администратора');
      else if (c.field === 'permissions') parts.push('Изменены разрешения');
      else if (c.field === 'role_id') parts.push('Изменена роль');
      else if (c.field === 'name') parts.push(`Имя: ${c.newValue}`);
    });
    return parts.join(' · ') || 'Изменения';
  };

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{getSummary()}</p>
          <p className="text-xs text-slate-400">
            {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm', { locale: dateFnsRu })}
            {entry.by_email && ` · ${entry.by_email}`}
          </p>
        </div>
        {changes.length > 0 && (open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />)}
      </button>

      {open && changes.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-2">
          {changes.map((c, i) => (
            <div key={i} className="text-xs">
              {c.field === 'permissions' ? (
                <div>
                  <p className="font-semibold text-slate-600 mb-1">Разрешения:</p>
                  {(c.added || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {c.added.map(k => (
                        <span key={k} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">+{PERM_LABELS[k] || k}</span>
                      ))}
                    </div>
                  )}
                  {(c.removed || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.removed.map(k => (
                        <span key={k} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">−{PERM_LABELS[k] || k}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium capitalize">{c.field}:</span>
                  <span className="line-through text-red-500">{String(c.oldValue ?? '—')}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-green-600">{String(c.newValue ?? '—')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmployeeHistoryDialog({ employee, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from ActivityLog filtered by entity_id = employee.id
    base44.entities.ActivityLog.filter({ entity_type: 'Employee', entity_id: employee.id })
      .then(logs => {
        // Parse history from change_log field or entity_data
        const entries = (employee.change_history || []).slice().reverse();
        setHistory(entries);
      })
      .finally(() => setLoading(false));
    
    // Use employee's own change_history
    const entries = (employee.change_history || []).slice().reverse();
    setHistory(entries);
    setLoading(false);
  }, [employee.id]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            История изменений: {employee.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">История изменений пуста</p>
            <p className="text-xs text-slate-300 mt-1">Изменения будут записываться начиная с этого момента</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry, i) => (
              <ChangeEntry key={i} entry={entry} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}