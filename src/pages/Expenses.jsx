import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Plus, Loader2, Receipt, TrendingDown, Pencil, Users, User,
  History, UserCircle, Search, LayoutGrid, List, AlertTriangle,
} from 'lucide-react';
import { parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import DateFilter from '@/components/filters/DateFilter';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import EmployeeExpensesProfile from '@/components/expenses/EmployeeExpensesProfile';
import BackButton from '@/components/ui/BackButton';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import ExpenseList from '@/components/expenses/ExpenseList';
import ExpenseBreakdown from '@/components/expenses/ExpenseBreakdown';
import ExpenseRing from '@/components/expenses/ExpenseRing';
import SpentByPicker from '@/components/expenses/SpentByPicker';
import { CATEGORIES, getCategoryInfo } from '@/components/expenses/expenseCategories';
import { formatExpenseDay, formatAddedAt, formatMoment } from '@/components/expenses/expenseTime';
import { EXPENSE_HERO_IMG, fmtMoney } from '@/components/expenses/expenseDesign';

const MAX_EDITS = 5;
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
  // Как показывать расходы: карточками или списком
  const [view, setView] = useState('grid');
  // Кому разрешено видеть все расходы, тот может переключиться на «только мои»
  const [mineOnly, setMineOnly] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  // Permissions
  // Сотрудник с правом «только свои расходы» видит исключительно свои записи,
  // даже если у него есть право видеть все расходы.
  const ownOnly = !isOwner && !employee?.is_admin && can('view_own_expenses_only');
  const hasAccess = isOwner || employee?.is_admin || can('view_expenses') || can('view_own_expenses_only');
  const canViewAll = !ownOnly && (isOwner || employee?.is_admin || can('view_all_expenses'));
  // Фактический охват списка: все расходы только у тех, кому это разрешено и кто не включил «только мои»
  const viewAll = canViewAll && !mineOnly;
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

    // Проверка: своё имя в поле «От имени» указывать не нужно —
    // без него расход автоматически записывается на автора.
    if (canRecordOnBehalf && isOwnName(form.spent_by_name)) {
      alert('Вы указали собственное имя. Своё имя выбирать не нужно: оставьте поле пустым — расход запишется на вас.');
      return;
    }

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
  const visible = viewAll
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

  // Легенда диаграммы: все категории в объявленном порядке, с суммами за выбранный период
  const legend = CATEGORIES.map(cat => ({
    ...cat,
    total: filtered.filter(e => e.category === cat.value).reduce((s, e) => s + (e.amount || 0), 0),
  }));

  const avgExpense = filtered.length > 0 ? totalFiltered / filtered.length : 0;
  const topCategory = [...legend].filter(c => c.total > 0).sort((a, b) => b.total - a.total)[0] || null;
  const daysWithExpenses = new Set(filtered.map(e => String(e.expense_date).slice(0, 10))).size;

  // Своё имя: указывать его в поле «От имени» не нужно
  const selfName = (employee?.name || currentUser?.full_name || '').trim();
  const isOwnName = (name) => !!selfName && (name || '').trim().toLowerCase() === selfName.toLowerCase();
  const ownNameSelected = isOwnName(form.spent_by_name);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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
    <div className="ep-page">

      {/* ── Шапка с иллюстрацией ── */}
      <div className="ep-hero">
        <img src={EXPENSE_HERO_IMG} alt="" />
        <div className="ep-hin">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <BackButton className="ep-eb ep-back" />
            <span className="ep-eb">
              <TrendingDown />
              Кассовая книга
            </span>
          </div>
          <h1 className="ep-title">Расходы</h1>
          <p className="ep-sub">
            {viewAll ? 'Все затраты бизнеса' : 'Только ваши расходы'} — аренда, зарплата, еда, прочее
          </p>
        </div>
      </div>

      {/* ── Плавающая панель управления ── */}
      <div className="ep-pill">
        {canViewAll ? (
          <button
            type="button"
            onClick={() => {
              const nextMine = !mineOnly;
              setMineOnly(nextMine);
              if (nextMine) setFilterAuthor('all');
            }}
            title={mineOnly ? 'Снова показать расходы всех сотрудников' : 'Показать только ваши расходы'}
            className="ep-btn"
          >
            {mineOnly ? <User /> : <Users />}
            {mineOnly ? 'Все расходы' : 'Только мои'}
          </button>
        ) : (
          <span className="ep-btn" style={{ cursor: 'default' }}>
            <Users />
            Только мои
          </span>
        )}

        <select
          className="ep-fld"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">Все категории</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {viewAll && authors.length > 0 && (
          <select
            className="ep-fld"
            value={filterAuthor}
            onChange={e => setFilterAuthor(e.target.value)}
          >
            <option value="all">Все авторы</option>
            {authors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        <label className="ep-sbox">
          <Search />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по расходам" />
        </label>

        <span className="ep-sp" />

        <div className="ep-seg">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={view === 'grid' ? 'on' : ''}
            title="Карточки"
          >
            <LayoutGrid />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={view === 'list' ? 'on' : ''}
            title="Список"
          >
            <List />
          </button>
        </div>

        {canAdd && (
          <button type="button" onClick={openAddForm} className="ep-btn ep-add">
            <Plus />
            Новый расход
          </button>
        )}
      </div>

      {/* ── Период ── */}
      <div className="ep-dates">
        <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* ── Кольцо и метрики ── */}
      <div className="ep-top">
        <ExpenseRing categories={legend} total={totalFiltered} count={filtered.length} />

        <div className="ep-mets">
          <div className="ep-met">
            <span className="ep-cap">Записей</span>
            <b>{filtered.length}</b>
            <small>за выбранный период</small>
          </div>
          <div className="ep-met">
            <span className="ep-cap">Средний расход</span>
            <b className="red">{fmtMoney(Math.round(avgExpense))} с.</b>
            <small>на одну запись</small>
          </div>
          <div className="ep-met">
            <span className="ep-cap">Больше всего</span>
            <b>{topCategory ? topCategory.label : '—'}</b>
            <small>{topCategory ? `${fmtMoney(topCategory.total)} с.` : 'нет данных'}</small>
          </div>
          <div className="ep-met">
            <span className="ep-cap">Дней с расходами</span>
            <b>{daysWithExpenses}</b>
            <small>уникальных дат</small>
          </div>
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

      {/* ── Разбивка по категориям ── */}
      <div className="ep-sec">
        <h2>Разбивка по категориям</h2>
        <span className="ep-sp" />
        <span className="ep-note">−{fmtMoney(totalFiltered)} с. · {filtered.length} записей</span>
      </div>
      <ExpenseBreakdown categories={legend} total={totalFiltered} />

      {/* ── Записи ── */}
      <div className="ep-sec">
        <h2>Расходы</h2>
        <span className="ep-sp" />
        <span className="ep-note">{filtered.length} записей в книге</span>
      </div>

      {filtered.length === 0 ? (
        <div className="ep-empty">
          <Receipt className="w-7 h-7" style={{ color: '#9aa39b' }} />
          <p>Расходов нет за выбранный период</p>
          {canAdd && (
            <button type="button" onClick={openAddForm} className="ep-btn ep-add">
              <Plus />
              Добавить первый расход
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        <ExpenseList
          expenses={filtered}
          maxEdits={MAX_EDITS}
          getEmployee={getEmpByName}
          canEdit={canEdit}
          canDelete={canDelete}
          deleting={deleting}
          onOpen={setViewingExpense}
          onEdit={openEditForm}
          onDelete={handleDelete}
        />
      ) : (
        <div className="ep-feed">
          {filtered.map((expense, i) => (
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
          ))}
        </div>
      )}

      {/* ── Диалог добавления/редактирования ── */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingExpense(null); } }}>
        <DialogContent className="ep-dialog max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="ep-dlg-title">
              {editingExpense ? 'Изменить расход' : 'Новый расход'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {editingExpense && (
              <div className="ep-note-box">
                Редактирование {(editingExpense.edit_count || 0) + 1} из {MAX_EDITS}. Каждое изменение сохраняется в историю.
              </div>
            )}

            <div>
              <label className="ep-lbl">Категория</label>
              <div className="ep-catpick">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const active = form.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      className={active ? 'on' : ''}
                    >
                      <Icon style={{ width: 13, height: 13 }} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ep-lbl">Сумма (с.)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="ep-fld box"
                  style={{ fontSize: 16, fontWeight: 600 }}
                />
              </div>
              <div>
                <label className="ep-lbl">Дата</label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                  className="ep-fld box"
                />
              </div>
            </div>

            <div>
              <label className="ep-lbl">Кому / получатель</label>
              <Input
                placeholder="Имя сотрудника, арендодатель..."
                value={form.recipient}
                onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                className="ep-fld box"
              />
            </div>

            {canRecordOnBehalf && (
              <div>
                <label className="ep-lbl">От имени (другое лицо)</label>
                <SpentByPicker
                  value={form.spent_by_name}
                  onChange={name => setForm(f => ({ ...f, spent_by_name: name }))}
                  employees={employees}
                  usedNames={spentByNames}
                  businessId={business?.id}
                  canManage={canRecordOnBehalf}
                  selfName={selfName}
                  onChanged={loadData}
                />
                <p className="ep-hint">
                  Если расход ваш — оставьте поле пустым: он автоматически запишется на ваше имя.
                  Выбирайте другое лицо только когда фиксируете чужой расход.
                </p>
                {ownNameSelected && (
                  <div className="ep-warn">
                    <AlertTriangle className="w-4 h-4 flex-none mt-[1px]" />
                    <span>
                      Это ваше имя. Своё имя выбирать не нужно: уберите его из поля — расход и так
                      запишется на вас автоматически.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="ep-lbl">Комментарий</label>
              <Input
                placeholder="За что? (необязательно)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="ep-fld box"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                className="ep-btn"
                onClick={() => { setShowForm(false); setEditingExpense(null); }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.amount || ownNameSelected}
                title={ownNameSelected ? 'Уберите своё имя из поля «От имени»' : undefined}
                className="ep-btn"
                style={{ background: '#2f6b57', borderColor: '#2f6b57', color: '#fff', fontWeight: 600 }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingExpense ? <Pencil /> : <Plus />)}
                {editingExpense ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Чек: детали расхода ── */}
      {viewingExpense && (
        <Dialog open={true} onOpenChange={() => setViewingExpense(null)}>
          <DialogContent className="ep-dialog max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="ep-dlg-title">Чек расхода</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="ep-detail">
                <span className="ep-ico" style={{ '--soft': getCategoryInfo(viewingExpense.category).soft }}>
                  {(() => {
                    const cat = getCategoryInfo(viewingExpense.category);
                    const Icon = cat.icon;
                    return <Icon style={{ color: cat.tone }} />;
                  })()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <span className="ep-cap">Категория</span>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{viewingExpense.category}</p>
                </div>
                <span className="v">−{fmtMoney(viewingExpense.amount)} с.</span>
              </div>

              <div className="ep-kv">
                <div>
                  <span className="ep-cap">Получатель</span>
                  <b>{viewingExpense.recipient || '—'}</b>
                </div>
                <div>
                  <span className="ep-cap">Дата расхода</span>
                  <b>{formatExpenseDay(viewingExpense.expense_date)}</b>
                </div>
                <div className="full">
                  <span className="ep-cap">Добавлен в систему (24 ч)</span>
                  <b className="tabular-nums">{formatAddedAt(viewingExpense.created_date)}</b>
                </div>
                <div className="full">
                  <span className="ep-cap">Автор расхода</span>
                  <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(() => {
                      const em = getEmpByName(viewingExpense.created_by_name);
                      return em
                        ? <EmployeeAvatar employee={em} sizeClass="w-4 h-4 rounded-full text-[9px]" />
                        : <User style={{ width: 14, height: 14, color: '#2f6b57' }} />;
                    })()}
                    {viewingExpense.created_by_name || '—'}
                    {viewingExpense.created_by_role && (
                      <span style={{ fontSize: 11.5, fontWeight: 400, color: '#9aa39b' }}>
                        ({viewingExpense.created_by_role === 'owner' ? 'владелец' : viewingExpense.created_by_role === 'admin' ? 'админ' : 'сотрудник'})
                      </span>
                    )}
                  </b>
                </div>
                {viewingExpense.spent_by_name && (
                  <div className="full">
                    <span className="ep-cap">От имени (другое лицо)</span>
                    <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserCircle style={{ width: 14, height: 14, color: '#2f6b57' }} />
                      {viewingExpense.spent_by_name}
                    </b>
                  </div>
                )}
                {viewingExpense.description && (
                  <div className="full">
                    <span className="ep-cap">Комментарий</span>
                    <b>{viewingExpense.description}</b>
                  </div>
                )}
              </div>

              {(viewingExpense.edit_count || 0) > 0 && (viewingExpense.edit_history || []).length > 0 && (
                <div className="ep-log">
                  <p className="ep-log-t">
                    <History className="w-3 h-3" />
                    История изменений ({viewingExpense.edit_count}/{MAX_EDITS})
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(viewingExpense.edit_history || []).map((h, i) => (
                      <div key={i} className="ep-log-row">
                        <div className="flex items-center justify-between gap-2">
                          <span><b>{h.by_name || h.by_email}</b></span>
                          <span className="tabular-nums">{formatMoment(h.edited_at)}</span>
                        </div>
                        {(h.changes || []).map((c, j) => (
                          <div key={j}>
                            {c.field}: {String(c.oldValue)} → <b>{String(c.newValue)}</b>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="ep-btn" onClick={() => setViewingExpense(null)}>Закрыть</button>
                {canEdit(viewingExpense) && (
                  <button
                    type="button"
                    onClick={() => { setViewingExpense(null); openEditForm(viewingExpense); }}
                    disabled={(viewingExpense.edit_count || 0) >= MAX_EDITS}
                    className="ep-btn"
                    style={{ background: '#2f6b57', borderColor: '#2f6b57', color: '#fff', fontWeight: 600 }}
                  >
                    <Pencil /> Редактировать
                  </button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}