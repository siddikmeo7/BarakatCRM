import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Loader2, Receipt, TrendingDown, Pencil, Users,
  Home, Truck, Zap, Megaphone, MoreHorizontal, UtensilsCrossed,
  History, User, ShoppingBasket, Heart, GraduationCap, Landmark,
  ScrollText, UserCircle
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import DateFilter from '@/components/filters/DateFilter';
import SearchInput from '@/components/filters/SearchInput';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import EmployeeExpensesProfile from '@/components/expenses/EmployeeExpensesProfile';
import BackButton from '@/components/ui/BackButton';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import ExpenseDonut from '@/components/expenses/ExpenseDonut';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import SpentByPanel from '@/components/expenses/SpentByPanel';
import SpentByPicker from '@/components/expenses/SpentByPicker';
import { CAP, CARD, EXPENSE_HERO_IMG, fmtMoney } from '@/components/expenses/expenseDesign';

const CATEGORIES = [
  { value: 'Аренда', label: 'Аренда', icon: Home, color: 'bg-blue-100 text-blue-600', bar: '#4f46e5' },
  { value: 'Зарплата', label: 'Зарплата', icon: Users, color: 'bg-green-100 text-green-600', bar: '#16a34a' },
  { value: 'Транспорт', label: 'Транспорт', icon: Truck, color: 'bg-orange-100 text-orange-600', bar: '#ea580c' },
  { value: 'Коммунальные', label: 'Коммунальные', icon: Zap, color: 'bg-yellow-100 text-yellow-600', bar: '#ca8a04' },
  { value: 'Реклама', label: 'Реклама', icon: Megaphone, color: 'bg-purple-100 text-purple-600', bar: '#9333ea' },
  { value: 'Еда', label: 'Еда', icon: UtensilsCrossed, color: 'bg-rose-100 text-rose-600', bar: '#06b6d4' },
  { value: 'На дом', label: 'На дом', icon: ShoppingBasket, color: 'bg-amber-100 text-amber-600', bar: '#d97706' },
  { value: 'Личные', label: 'Личные', icon: Heart, color: 'bg-pink-100 text-pink-600', bar: '#db2777' },
  { value: 'Обучение', label: 'Обучение', icon: GraduationCap, color: 'bg-violet-100 text-violet-600', bar: '#7c3aed' },
  { value: 'Налог', label: 'Налог', icon: Landmark, color: 'bg-cyan-100 text-cyan-600', bar: '#0891b2' },
  { value: 'Патент', label: 'Патент', icon: ScrollText, color: 'bg-teal-100 text-teal-600', bar: '#0d9488' },
  { value: 'Прочее', label: 'Прочее', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600', bar: '#64748b' },
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
const FIELD = 'mt-1.5 h-9 rounded-[11px] bg-slate-50 dark:bg-slate-800';
const PILL_OUT = 'exp-focus rounded-full border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200';
const FILTER_SELECT = 'h-[34px] rounded-[11px] border-slate-200 bg-white text-xs text-slate-700 hover:border-indigo-300 hover:shadow-[0_2px_8px_rgba(79,70,229,.12)] transition';

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
  // Сотрудник с правом «только свои расходы» видит исключительно свои записи,
  // даже если у него есть право видеть все расходы.
  const ownOnly = !isOwner && !employee?.is_admin && can('view_own_expenses_only');
  const hasAccess = isOwner || employee?.is_admin || can('view_expenses') || can('view_own_expenses_only');
  const canViewAll = !ownOnly && (isOwner || employee?.is_admin || can('view_all_expenses'));
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

  // Легенда диаграммы: все категории в объявленном порядке, с суммами за выбранный период
  const legend = CATEGORIES.map(cat => ({
    ...cat,
    total: filtered.filter(e => e.category === cat.value).reduce((s, e) => s + (e.amount || 0), 0),
  }));
  const spentByTotal = bySpentBy.reduce((s, item) => s + item.total, 0);
  const topSpentBy = bySpentBy[0] || null;
  const showSide = canViewAll && bySpentBy.length > 0;

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
    <div className="-m-4 lg:-m-8 min-h-[calc(100vh-3.5rem)] bg-slate-100 dark:bg-slate-950 p-4 lg:p-8 pb-32 space-y-5">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-[28px] min-h-[230px] flex items-end justify-between gap-6 px-6 py-7 lg:px-9 shadow-[0_12px_32px_rgba(15,23,42,.12)]">
        <img src={EXPENSE_HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/[.94] via-white/[.82] to-white/[.25]"></div>
        <div className="relative">
          <BackButton className="exp-focus mb-3.5 bg-white border border-slate-200 rounded-xl px-3.5 py-[7px] text-[13px] font-semibold text-slate-600 hover:shadow-[0_4px_12px_rgba(15,23,42,.1)] active:bg-slate-100" />
          <h1 className="text-3xl lg:text-[40px] font-bold leading-[1.1] tracking-[-.5px] text-slate-900 flex items-center gap-2.5">
            <TrendingDown className="w-7 h-7 lg:w-[34px] lg:h-[34px] text-red-500 flex-none" />
            Расходы
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {canViewAll ? 'Все затраты бизнеса' : 'Только ваши расходы'} — аренда, зарплата, еда, прочее
          </p>
        </div>
      </div>

      {/* ── Профиль сотрудника ── */}
      {employee && !isOwner && (
        <EmployeeExpensesProfile
          employee={employee}
          total={totalFiltered}
          count={filtered.length}
          businessName={business?.name}
        />
      )}

      {/* ── Диаграмма + плитки ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-5 items-stretch">
        <ExpenseDonut categories={legend} total={totalFiltered} />

        <div className="flex flex-col gap-5">
          <div className={`${CARD} p-6 flex-1 flex flex-col justify-center gap-2`}>
            <span className={CAP}>Расходы</span>
            <span className="text-[30px] font-bold text-red-600 tabular-nums tracking-[-.4px]">−{fmtMoney(totalFiltered)} с.</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <TrendingDown className="w-[15px] h-[15px] text-indigo-600 flex-none" />
              Итого за период
            </span>
          </div>

          {canViewAll && (
            <div className={`${CARD} p-6 flex-1 flex flex-col justify-center gap-2`}>
              <span className={CAP}>От имени других лиц</span>
              <span className="text-[30px] font-bold text-indigo-600 tabular-nums tracking-[-.4px]">−{fmtMoney(spentByTotal)} с.</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <UserCircle className="w-[15px] h-[15px] text-cyan-500 flex-none" />
                {topSpentBy?.name || 'нет данных'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Фильтры ── */}
      <div className="sticky top-14 z-30 rounded-[22px] border border-slate-200/80 dark:border-slate-700/60 bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,.08)] flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
          <Users className="w-3.5 h-3.5" />
          {canViewAll ? 'Все расходы' : 'Только мои'}
        </span>

        <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className={`${FILTER_SELECT} w-36`}>
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {canViewAll && authors.length > 0 && (
          <Select value={filterAuthor} onValueChange={setFilterAuthor}>
            <SelectTrigger className={`${FILTER_SELECT} w-40`}>
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
            <SelectTrigger className={`${FILTER_SELECT} w-44`}>
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
          <span className={CAP}>Итого за период</span>
          <p className="text-[26px] leading-[1.15] font-bold text-red-600 tabular-nums">−{fmtMoney(totalFiltered)} с.</p>
        </div>
      </div>

      {/* ── Стена карточек + панель лиц ── */}
      <div className={`grid grid-cols-1 gap-5 items-start ${showSide ? 'xl:grid-cols-[1fr_340px]' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className={`${CARD} expense-rise col-span-full md:col-span-2 flex flex-col items-center gap-2.5 p-7 text-center`}>
              <div className="w-[54px] h-[54px] rounded-full bg-red-100 text-red-400 flex items-center justify-center">
                <Receipt className="w-[26px] h-[26px]" />
              </div>
              <p className="font-semibold text-slate-500 text-sm">Расходов нет за выбранный период</p>
              {canAdd && (
                <Button onClick={openAddForm} variant="outline" className={`${PILL_OUT} gap-2`}>
                  <Plus className="w-4 h-4" /> Добавить первый расход
                </Button>
              )}
            </div>
          ) : (
            filtered.map((expense, i) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                index={i}
                maxEdits={MAX_EDITS}
                authorEmployee={getEmpByName(expense.created_by_name)}
                canEdit={canEdit(expense)}
                canDelete={canDelete(expense)}
                deleting={deleting}
                onOpen={() => setViewingExpense(expense)}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {showSide && (
          <SpentByPanel
            items={bySpentBy}
            activeName={filterSpentBy}
            onToggle={(name) => setFilterSpentBy(prev => prev === name ? 'all' : name)}
            onReset={() => setFilterSpentBy('all')}
            getEmployee={getEmpByName}
          />
        )}
      </div>

      {/* ── Плавающая кнопка добавления ── */}
      {canAdd && (
        <button
          onClick={openAddForm}
          className="exp-focus animate-float-pill fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_30px_rgba(79,70,229,.4)] transition hover:shadow-[0_18px_38px_rgba(79,70,229,.5)] hover:brightness-105 active:brightness-95"
        >
          <Plus className="w-4 h-4" />
          Добавить расход
        </button>
      )}

      {/* ── Диалог добавления/редактирования ── */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingExpense(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-[17px] font-bold">{editingExpense ? 'Редактировать расход' : 'Добавить расход'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editingExpense && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                Редактирование {(editingExpense.edit_count || 0) + 1} из {MAX_EDITS}. Каждое изменение сохраняется в историю.
              </div>
            )}

            <div>
              <label className={CAP}>Категория</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const active = form.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      className={`exp-focus flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 text-xs font-semibold transition-all ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={CAP}>Сумма (с.)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={`${FIELD} text-lg font-bold`}
                />
              </div>
              <div>
                <label className={CAP}>Дата</label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                  className={FIELD}
                />
              </div>
            </div>

            <div>
              <label className={CAP}>Кому / Получатель</label>
              <Input
                placeholder="Имя сотрудника, арендодатель..."
                value={form.recipient}
                onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                className={FIELD}
              />
            </div>

            {canRecordOnBehalf && (
              <div>
                <label className={CAP}>От имени (другое лицо)</label>
                <SpentByPicker
                  value={form.spent_by_name}
                  onChange={name => setForm(f => ({ ...f, spent_by_name: name }))}
                  employees={employees}
                  usedNames={spentByNames}
                  className={FIELD}
                />
                <p className="text-xs text-slate-400 mt-1">Укажите, если фиксируете чужой расход — позже увидите сумму по этому лицу.</p>
              </div>
            )}

            <div>
              <label className={CAP}>Комментарий</label>
              <Input
                placeholder="За что? (необязательно)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={FIELD}
              />
            </div>

            {!editingExpense && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3" /> Расход будет записан на ваше имя автоматически
              </p>
            )}

            <div className="flex gap-2.5 justify-end pt-1">
              <Button variant="outline" className={PILL_OUT} onClick={() => { setShowForm(false); setEditingExpense(null); }}>
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.amount}
                className={`exp-focus rounded-full px-5 py-2.5 gap-2 font-bold text-white transition hover:brightness-105 ${
                  editingExpense ? 'bg-indigo-600' : 'bg-gradient-to-br from-cyan-500 to-cyan-600'
                }`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingExpense ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                {editingExpense ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Диалог деталей ── */}
      {viewingExpense && (
        <Dialog open={true} onOpenChange={() => setViewingExpense(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                {(() => { const Icon = getCategoryInfo(viewingExpense.category).icon; return <Icon className="w-5 h-5 text-red-500" />; })()}
                <span className="text-[17px] font-bold">Детали расхода</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className={`rounded-2xl p-4 ${getCategoryInfo(viewingExpense.category).color}`}>
                <p className="text-[10.5px] uppercase tracking-[.12em] font-bold opacity-80">Категория</p>
                <p className="text-lg font-bold">{viewingExpense.category}</p>
                <p className="text-[30px] font-bold mt-2 tabular-nums tracking-[-.4px]">−{fmtMoney(viewingExpense.amount)} с.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className={CAP}>Получатель</span>
                  <span className="text-sm font-semibold text-slate-800">{viewingExpense.recipient || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={CAP}>Дата и время</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {format(parseISO(viewingExpense.expense_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                  </span>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className={CAP}>Автор расхода</span>
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    {(() => { const em = getEmpByName(viewingExpense.created_by_name); return em
                      ? <EmployeeAvatar employee={em} sizeClass="w-5 h-5 rounded-full text-[10px]" />
                      : <User className="w-4 h-4 text-indigo-500" />; })()}
                    {viewingExpense.created_by_name || '—'}
                    {viewingExpense.created_by_role && (
                      <span className="text-xs font-normal text-slate-400">
                        ({viewingExpense.created_by_role === 'owner' ? 'владелец' : viewingExpense.created_by_role === 'admin' ? 'админ' : 'сотрудник'})
                      </span>
                    )}
                  </span>
                </div>
                {viewingExpense.spent_by_name && (
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className={CAP}>От имени (другое лицо)</span>
                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <UserCircle className="w-4 h-4 text-cyan-600" />
                      {viewingExpense.spent_by_name}
                    </span>
                  </div>
                )}
                {viewingExpense.description && (
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className={CAP}>Комментарий</span>
                    <span className="text-sm font-semibold text-slate-800">{viewingExpense.description}</span>
                  </div>
                )}
              </div>

              {(viewingExpense.edit_count || 0) > 0 && (viewingExpense.edit_history || []).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-[12.5px] font-bold text-amber-800 mb-1.5 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-500" />
                    История изменений ({viewingExpense.edit_count}/{MAX_EDITS})
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(viewingExpense.edit_history || []).map((h, i) => (
                      <div key={i} className="text-[12.5px] text-amber-700">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{h.by_name || h.by_email}</span>
                          <span className="text-amber-600/80">{format(parseISO(h.edited_at), 'dd MMM yyyy, HH:mm', { locale: ru })}</span>
                        </div>
                        {(h.changes || []).map((c, j) => (
                          <div key={j}>
                            <span className="font-semibold">{c.field}:</span> {String(c.oldValue)} → <span className="font-semibold">{String(c.newValue)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 justify-end pt-1">
                <Button variant="outline" className={PILL_OUT} onClick={() => setViewingExpense(null)}>Закрыть</Button>
                {canEdit(viewingExpense) && (
                  <Button
                    onClick={() => { setViewingExpense(null); openEditForm(viewingExpense); }}
                    disabled={(viewingExpense.edit_count || 0) >= MAX_EDITS}
                    className="exp-focus rounded-full px-5 py-2.5 gap-2 font-bold text-white bg-indigo-600 transition hover:brightness-105"
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