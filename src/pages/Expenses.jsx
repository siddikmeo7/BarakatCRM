import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Trash2, Loader2, Receipt, TrendingDown, Pencil, Search,
  Home, Users, Truck, Zap, Megaphone, MoreHorizontal, Calendar,
  UtensilsCrossed, History, User, ShoppingBasket, Heart, GraduationCap,
  Landmark, ScrollText, UserCircle
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import DateFilter from '@/components/filters/DateFilter';
import SearchInput from '@/components/filters/SearchInput';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import BackButton from '@/components/ui/BackButton';
import OwnerProfitControl from '@/components/expenses/OwnerProfitControl';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

const CATEGORIES = [
  { value: 'Аренда', label: 'Аренда', icon: Home, color: 'bg-blue-100 text-blue-600' },
  { value: 'Зарплата', label: 'Зарплата', icon: Users, color: 'bg-green-100 text-green-600' },
  { value: 'Транспорт', label: 'Транспорт', icon: Truck, color: 'bg-orange-100 text-orange-600' },
  { value: 'Коммунальные', label: 'Коммунальные', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
  { value: 'Реклама', label: 'Реклама', icon: Megaphone, color: 'bg-purple-100 text-purple-600' },
  { value: 'Еда', label: 'Еда', icon: UtensilsCrossed, color: 'bg-rose-100 text-rose-600' },
  { value: 'На дом', label: 'На дом', icon: ShoppingBasket, color: 'bg-amber-100 text-amber-600' },
  { value: 'Личные', label: 'Личные', icon: Heart, color: 'bg-pink-100 text-pink-600' },
  { value: 'Обучение', label: 'Обучение', icon: GraduationCap, color: 'bg-violet-100 text-violet-600' },
  { value: 'Налог', label: 'Налог', icon: Landmark, color: 'bg-cyan-100 text-cyan-600' },
  { value: 'Патент', label: 'Патент', icon: ScrollText, color: 'bg-teal-100 text-teal-600' },
  { value: 'Прочее', label: 'Прочее', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600' },
];

const MAX_EDITS = 5;
const getCategoryInfo = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
const DEFAULT_FORM = {
  category: 'Аренда',
  amount: '',
  description: '',
  recipient: '',
  spent_by_name: '',
  expense_date: new Date().toISOString().slice(0, 10),
};

export default function Expenses() {
  const { can, isOwner, employee } = useEmployeeAccess();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [business, setBusiness] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAuthor, setFilterAuthor] = useState('all');
  const [filterSpentBy, setFilterSpentBy] = useState('all');
  const [form, setForm] = useState(DEFAULT_FORM);

  // Permissions
  const hasAccess = isOwner || employee?.is_admin || can('view_expenses');
  const canViewAll = isOwner || employee?.is_admin || can('view_all_expenses');
  const canManageAny = isOwner || employee?.is_admin || can('manage_expenses');
  const canRecordOnBehalf = isOwner || employee?.is_admin || can('record_expenses_on_behalf');
  const canAdd = hasAccess;

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
      const user = await base44.auth.me().catch(() => null);
      if (user) setCurrentUser(user);
      if (!biz) { setLoading(false); return; }
      setBusiness(biz);
      const data = await base44.entities.Expense.filter({ business_id: biz.id });
      setExpenses(data.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date)));
      try {
        const emps = await base44.entities.Employee.filter({ business_id: biz.id });
        setEmployees(emps);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingExpense(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEditForm = (expense) => {
    if ((expense.edit_count || 0) >= MAX_EDITS) {
      alert(`⚠️ Этот расход уже отредактирован максимальное количество раз (${MAX_EDITS}).`);
      return;
    }
    setEditingExpense(expense);
    setForm({
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description || '',
      recipient: expense.recipient || '',
      spent_by_name: expense.spent_by_name || '',
      expense_date: (expense.expense_date || '').slice(0, 10),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.category) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      const emp = window.__barakatEmployee;
      const authorName = emp?.name || user.full_name || user.email;
      const authorRole = emp ? (emp.is_admin ? 'admin' : 'employee') : 'owner';

      if (editingExpense) {
        const changes = [];
        if (editingExpense.category !== form.category) changes.push({ field: 'category', oldValue: editingExpense.category, newValue: form.category });
        if (String(editingExpense.amount) !== String(parseFloat(form.amount))) changes.push({ field: 'amount', oldValue: editingExpense.amount, newValue: parseFloat(form.amount) });
        if ((editingExpense.description || '') !== form.description) changes.push({ field: 'description', oldValue: editingExpense.description || '', newValue: form.description });
        if ((editingExpense.recipient || '') !== form.recipient) changes.push({ field: 'recipient', oldValue: editingExpense.recipient || '', newValue: form.recipient });
        if ((editingExpense.spent_by_name || '') !== form.spent_by_name) changes.push({ field: 'spent_by_name', oldValue: editingExpense.spent_by_name || '', newValue: form.spent_by_name });
        const oldDate = (editingExpense.expense_date || '').slice(0, 10);
        if (oldDate !== form.expense_date) changes.push({ field: 'expense_date', oldValue: oldDate, newValue: form.expense_date });

        const newCount = (editingExpense.edit_count || 0) + 1;
        const updated = await base44.entities.Expense.update(editingExpense.id, {
          category: form.category,
          amount: parseFloat(form.amount),
          description: form.description,
          recipient: form.recipient,
          spent_by_name: canRecordOnBehalf ? form.spent_by_name : '',
          expense_date: new Date(form.expense_date).toISOString(),
          edit_count: newCount,
          edit_history: [...(editingExpense.edit_history || []), {
            edited_at: new Date().toISOString(),
            by_email: user.email,
            by_name: authorName,
            changes,
          }],
        });
        await base44.entities.ActivityLog.create({
          business_id: business.id,
          action_type: 'update',
          entity_type: 'Expense',
          entity_id: editingExpense.id,
          entity_data: updated,
          user_email: user.email,
          user_name: authorName,
          description: `Изменён расход: ${form.category} — ${form.amount} с. (редактирование ${newCount}/${MAX_EDITS})`,
        });
      } else {
        const expense = await base44.entities.Expense.create({
          business_id: business.id,
          category: form.category,
          amount: parseFloat(form.amount),
          description: form.description,
          recipient: form.recipient,
          spent_by_name: canRecordOnBehalf ? form.spent_by_name : '',
          expense_date: new Date(form.expense_date).toISOString(),
          created_by_name: authorName,
          created_by_role: authorRole,
          edit_count: 0,
          edit_history: [],
        });
        await base44.entities.ActivityLog.create({
          business_id: business.id,
          action_type: 'create',
          entity_type: 'Expense',
          entity_id: expense.id,
          entity_data: expense,
          user_email: user.email,
          user_name: authorName,
          description: `Добавлен расход: ${form.category} — ${form.amount} с. ${form.recipient ? `(${form.recipient})` : ''} ${form.spent_by_name ? `[от имени: ${form.spent_by_name}]` : ''} ${form.description ? `| ${form.description}` : ''}`,
        });
      }
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setEditingExpense(null);
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
      const emp = window.__barakatEmployee;
      const authorName = emp?.name || user.full_name || user.email;
      await base44.entities.Expense.delete(expense.id);
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: 'delete',
        entity_type: 'Expense',
        entity_id: expense.id,
        entity_data: expense,
        user_email: user.email,
        user_name: authorName,
        description: `Удалён расход: ${expense.category} — ${expense.amount} с.`,
      });
      loadData();
    } finally {
      setDeleting(null);
    }
  };

  // Permission filter: own vs all
  const visible = canViewAll
    ? expenses
    : expenses.filter(e => e.created_by_id === currentUser?.id);

  const filtered = visible.filter(e => {
    if (dateRange?.from) {
      try {
        const d = parseISO(e.expense_date);
        if (!isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) })) return false;
      } catch { return false; }
    }
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterAuthor !== 'all' && (e.created_by_name || '') !== filterAuthor) return false;
    if (filterSpentBy !== 'all' && (e.spent_by_name || '') !== filterSpentBy) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${e.category} ${e.description || ''} ${e.recipient || ''} ${e.created_by_name || ''} ${e.spent_by_name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const authors = [...new Set(visible.map(e => e.created_by_name).filter(Boolean))];
  const spentByNames = [...new Set(visible.map(e => e.spent_by_name).filter(Boolean))];
  const bySpentBy = spentByNames
    .map(name => ({ name, total: visible.filter(e => e.spent_by_name === name).reduce((s, e) => s + (e.amount || 0), 0) }))
    .sort((a, b) => b.total - a.total);

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

  if (!hasAccess) {
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

  const isOwnExpense = (e) => e.created_by_id === currentUser?.id;
  const canEdit = (e) => canManageAny || (isOwnExpense(e) && hasAccess);
  const canDelete = (e) => canManageAny || isOwnExpense(e);
  const getEmpByName = (nm) => employees.find(e => e.name === nm) || null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <BackButton className="mb-2" />
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-500" />
            Расходы
            {!canViewAll && <span className="text-sm font-normal text-slate-400">(ваши расходы)</span>}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {canViewAll ? 'Все затраты бизнеса' : 'Только ваши расходы'} — аренда, зарплата, еда, прочее
          </p>
        </div>
        {canAdd && (
          <Button onClick={openAddForm} className="bg-red-500 hover:bg-red-600 text-white gap-2">
            <Plus className="w-4 h-4" />
            Добавить расход
          </Button>
        )}
      </div>

      {hasAccess && business && (canViewAll || can('view_expense_sales_revenue') || can('view_expense_money_in_hand')) && (
        <OwnerProfitControl business={business} />
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center gap-3">
        <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {canViewAll && authors.length > 0 && (
          <Select value={filterAuthor} onValueChange={setFilterAuthor}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Автор" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все авторы</SelectItem>
              {authors.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {canViewAll && spentByNames.length > 0 && (
          <Select value={filterSpentBy} onValueChange={setFilterSpentBy}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="От имени" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все лица</SelectItem>
              {spentByNames.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." className="flex-1 min-w-32" />
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-400">Итого за период</p>
          <p className="text-2xl font-bold text-red-600">−{totalFiltered.toLocaleString()} с.</p>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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

      {canViewAll && bySpentBy.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <UserCircle className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">Расходы от имени других лиц</h3>
            <span className="text-xs text-slate-400">— за весь период бизнеса</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {bySpentBy.map(item => (
              <div
                key={item.name}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  filterSpentBy === item.name
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => setFilterSpentBy(prev => prev === item.name ? 'all' : item.name)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {(() => { const em = getEmpByName(item.name); return em
                    ? <EmployeeAvatar employee={em} sizeClass="w-8 h-8 rounded-2xl text-xs" />
                    : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>; })()}
                  <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-red-600 flex-shrink-0">−{item.total.toLocaleString()} с.</span>
              </div>
            ))}
          </div>
          {filterSpentBy !== 'all' && (
            <button onClick={() => setFilterSpentBy('all')} className="mt-2 text-xs text-indigo-500 hover:text-indigo-600">
              Сбросить фильтр по лицу
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-red-300" />
            </div>
            <p className="text-slate-500 font-medium">Расходов нет за выбранный период</p>
            {canAdd && (
              <Button onClick={openAddForm} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Добавить первый расход
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto custom-scroll">
            {filtered.map(expense => {
              const cat = getCategoryInfo(expense.category);
              const Icon = cat.icon;
              const editsLeft = MAX_EDITS - (expense.edit_count || 0);
              return (
                <div key={expense.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setViewingExpense(expense)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{expense.category}</span>
                      {expense.recipient && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{expense.recipient}</span>
                      )}
                      {expense.created_by_name && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 pl-1 pr-2 py-0.5 rounded-full flex items-center gap-1">
                          {(() => { const em = getEmpByName(expense.created_by_name); return em
                            ? <EmployeeAvatar employee={em} sizeClass="w-4 h-4 rounded-full text-[9px]" />
                            : <User className="w-3 h-3" />; })()}
                          {expense.created_by_name}
                        </span>
                      )}
                      {expense.spent_by_name && (
                        <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCircle className="w-3 h-3" /> от имени: {expense.spent_by_name}
                        </span>
                      )}
                      {(expense.edit_count || 0) > 0 && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> {expense.edit_count}/{MAX_EDITS}
                        </span>
                      )}
                    </div>
                    {expense.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{expense.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(expense.expense_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <p className="text-base font-bold text-red-600">−{expense.amount.toLocaleString()} с.</p>
                    {canEdit(expense) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm(expense); }}
                        disabled={editsLeft <= 0}
                        title={editsLeft <= 0 ? 'Лимит редактирований исчерпан' : `Осталось редактирований: ${editsLeft}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete(expense) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(expense); }}
                        disabled={deleting === expense.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        {deleting === expense.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingExpense(null); } }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              {editingExpense ? 'Редактировать расход' : 'Добавить расход'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editingExpense && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Редактирование {(editingExpense.edit_count || 0) + 1} из {MAX_EDITS}. Каждое изменение сохраняется в историю.
              </p>
            )}
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
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Сумма (с.)</label>
              <Input type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="text-lg font-bold" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Кому / Получатель</label>
              <Input placeholder="Имя сотрудника, арендодатель..." value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} />
            </div>
            {canRecordOnBehalf && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block flex items-center gap-1.5">
                  <UserCircle className="w-4 h-4 text-cyan-600" />
                  От имени (другое лицо)
                </label>
                <Input
                  list="spent-by-options"
                  placeholder="Имя незарегистрированного сотрудника / лица"
                  value={form.spent_by_name}
                  onChange={e => setForm(f => ({ ...f, spent_by_name: e.target.value }))}
                />
                <datalist id="spent-by-options">
                  {spentByNames.map(n => <option key={n} value={n} />)}
                </datalist>
                <p className="text-xs text-slate-400 mt-1">Укажите, если фиксируете чужой расход — позже увидите сумму по этому лицу.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Комментарий</label>
              <Input placeholder="За что? (необязательно)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Дата</label>
              <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
            </div>
            {!editingExpense && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3" /> Расход будет записан на ваше имя автоматически
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingExpense(null); }}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving || !form.amount} className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingExpense ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                {editingExpense ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      {viewingExpense && (
        <Dialog open={true} onOpenChange={() => setViewingExpense(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                {(() => { const Icon = getCategoryInfo(viewingExpense.category).icon; return <Icon className="w-5 h-5 text-red-500" />; })()}
                Детали расхода
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className={`rounded-xl p-4 ${getCategoryInfo(viewingExpense.category).color}`}>
                <p className="text-xs font-medium opacity-80">Категория</p>
                <p className="text-lg font-bold">{viewingExpense.category}</p>
                <p className="text-2xl font-bold mt-2">−{viewingExpense.amount?.toLocaleString()} с.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Получатель</p>
                  <p className="font-medium text-slate-800">{viewingExpense.recipient || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Дата и время</p>
                  <p className="font-medium text-slate-800">{format(parseISO(viewingExpense.expense_date), 'dd MMM yyyy, HH:mm', { locale: ru })}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400">Автор расхода</p>
                  <p className="font-medium text-slate-800 flex items-center gap-1.5">
                    {(() => { const em = getEmpByName(viewingExpense.created_by_name); return em
                      ? <EmployeeAvatar employee={em} sizeClass="w-5 h-5 rounded-full text-[10px]" />
                      : <User className="w-4 h-4 text-indigo-500" />; })()}
                    {viewingExpense.created_by_name || '—'}
                    {viewingExpense.created_by_role && (
                      <span className="text-xs text-slate-400">
                        ({viewingExpense.created_by_role === 'owner' ? 'владелец' : viewingExpense.created_by_role === 'admin' ? 'админ' : 'сотрудник'})
                      </span>
                    )}
                  </p>
                </div>
                {viewingExpense.spent_by_name && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">От имени (другое лицо)</p>
                    <p className="font-medium text-slate-800 flex items-center gap-1.5">
                      <UserCircle className="w-4 h-4 text-cyan-600" />
                      {viewingExpense.spent_by_name}
                    </p>
                  </div>
                )}
                {viewingExpense.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Комментарий</p>
                    <p className="font-medium text-slate-800">{viewingExpense.description}</p>
                  </div>
                )}
              </div>
              {(viewingExpense.edit_count || 0) > 0 && (viewingExpense.edit_history || []).length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-amber-500" />
                    История изменений ({viewingExpense.edit_count}/{MAX_EDITS})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(viewingExpense.edit_history || []).map((h, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-700">{h.by_name || h.by_email}</span>
                          <span className="text-slate-400">{format(parseISO(h.edited_at), 'dd MMM yyyy, HH:mm', { locale: ru })}</span>
                        </div>
                        {(h.changes || []).map((c, j) => (
                          <div key={j} className="text-slate-500">
                            <span className="font-medium">{c.field}:</span> {String(c.oldValue)} → <span className="text-slate-800 font-medium">{String(c.newValue)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setViewingExpense(null)}>Закрыть</Button>
                {canEdit(viewingExpense) && (
                  <Button
                    onClick={() => { setViewingExpense(null); openEditForm(viewingExpense); }}
                    disabled={(viewingExpense.edit_count || 0) >= MAX_EDITS}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white gap-2"
                  >
                    <Pencil className="w-4 h-4" /> Редактировать
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}