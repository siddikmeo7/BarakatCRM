import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Trash2, Loader2, Receipt, TrendingDown, AlertCircle,
  Home, Users, Truck, Zap, Megaphone, MoreHorizontal, Calendar
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import DateFilter from '@/components/filters/DateFilter';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import BackButton from '@/components/ui/BackButton';

const CATEGORIES = [
  { value: 'Аренда', label: 'Аренда', icon: Home, color: 'bg-blue-100 text-blue-600' },
  { value: 'Зарплата', label: 'Зарплата', icon: Users, color: 'bg-green-100 text-green-600' },
  { value: 'Транспорт', label: 'Транспорт', icon: Truck, color: 'bg-orange-100 text-orange-600' },
  { value: 'Коммунальные', label: 'Коммунальные', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
  { value: 'Реклама', label: 'Реклама', icon: Megaphone, color: 'bg-purple-100 text-purple-600' },
  { value: 'Прочее', label: 'Прочее', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600' },
];

const getCategoryInfo = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[5];

export default function Expenses() {
  const { can, isOwner } = useEmployeeAccess();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [business, setBusiness] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const [form, setForm] = useState({
    category: 'Аренда',
    amount: '',
    description: '',
    recipient: '',
    expense_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (window.__barakatAccessReady) loadData();
    else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }
      if (biz) {
        setBusiness(biz);
        const data = await base44.entities.Expense.filter({ business_id: biz.id });
        setExpenses(data.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date)));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.amount || !form.category) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      const expense = await base44.entities.Expense.create({
        business_id: business.id,
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
        recipient: form.recipient,
        expense_date: new Date(form.expense_date).toISOString(),
      });
      // Лог активности
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: 'create',
        entity_type: 'Expense',
        entity_id: expense.id,
        entity_data: expense,
        user_email: user.email,
        description: `Добавлен расход: ${form.category} — ${form.amount} с. ${form.recipient ? `(${form.recipient})` : ''} ${form.description ? `| ${form.description}` : ''}`,
      });
      setShowForm(false);
      setForm({ category: 'Аренда', amount: '', description: '', recipient: '', expense_date: new Date().toISOString().slice(0, 10) });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Удалить расход "${expense.category}" на ${expense.amount} с.?`)) return;
    setDeleting(expense.id);
    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      await base44.entities.Expense.delete(expense.id);
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: 'delete',
        entity_type: 'Expense',
        entity_id: expense.id,
        entity_data: expense,
        user_email: user.email,
        description: `Удалён расход: ${expense.category} — ${expense.amount} с.`,
      });
      loadData();
    } finally {
      setDeleting(null);
    }
  };

  const filtered = expenses.filter(e => {
    if (!dateRange?.from) return true;
    try {
      const d = parseISO(e.expense_date);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) });
    } catch { return false; }
  });

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  // Группировка по категориям
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: filtered.filter(e => e.category === cat.value).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // Проверка прав
  if (!isOwner && !can('view_expenses')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          <Receipt className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Нет доступа</h2>
        <p className="text-slate-400 max-w-sm">У вас нет разрешения на просмотр раздела «Расходы».</p>
      </div>
    );
  }

  const canManage = isOwner || can('manage_expenses');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <BackButton className="mb-2" />
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-500" />
            Расходы
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Все затраты: аренда, зарплата, прочее</p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-red-500 hover:bg-red-600 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить расход
          </Button>
        )}
      </div>

      {/* Filter + total */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
        <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-400">Итого за период</p>
          <p className="text-2xl font-bold text-red-600">−{totalFiltered.toLocaleString()} с.</p>
        </div>
      </div>

      {/* Category summary */}
      {byCategory.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {byCategory.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.value} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center gap-2 text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">{cat.label}</p>
                <p className="text-sm font-bold text-slate-800">{cat.total.toLocaleString()} с.</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Expense list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-red-300" />
            </div>
            <p className="text-slate-500 font-medium">Расходов нет за выбранный период</p>
            {canManage && (
              <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Добавить первый расход
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(expense => {
              const cat = getCategoryInfo(expense.category);
              const Icon = cat.icon;
              return (
                <div key={expense.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{expense.category}</span>
                      {expense.recipient && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{expense.recipient}</span>
                      )}
                    </div>
                    {expense.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{expense.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(expense.expense_date), 'dd.MM.yyyy')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                  <p className="text-base font-bold text-red-600">−{expense.amount.toLocaleString()} с.</p>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(expense)}
                      disabled={deleting === expense.id}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deleting === expense.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              Добавить расход
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Category */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Категория</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                        form.category === cat.value
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Сумма (с.)</label>
              <Input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="text-lg font-bold"
              />
            </div>

            {/* Recipient */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Кому / Получатель</label>
              <Input
                placeholder="Имя сотрудника, арендодатель..."
                value={form.recipient}
                onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Комментарий</label>
              <Input
                placeholder="За что? (необязательно)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Дата</label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Отмена</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.amount}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}