import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import BrandedLoader from '@/components/ui/BrandedLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  History, RotateCcw, Trash2, Package, ShoppingCart, Users, AlertCircle, Eye,
  ArrowLeft, Database, RefreshCw, User, Clock, ChevronRight, CheckCircle2,
  XCircle, Edit3, PlusCircle, Search, Square, CheckSquare, ChevronDown,
  BarChart2, X, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

const ENTITY_ICONS = {
  Product: Package, Sale: ShoppingCart, Customer: Users,
  Warehouse: Database, Employee: Users, Return: RotateCcw
};
const ENTITY_LABELS = {
  Product: 'Товар', Sale: 'Продажа', Customer: 'Клиент',
  Warehouse: 'Склад', Employee: 'Сотрудник', Return: 'Возврат'
};
const ACTION_COLORS = {
  create: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  update: 'bg-blue-100 text-blue-700 border-blue-200',
  delete: 'bg-red-100 text-red-700 border-red-200'
};
const ACTION_ICONS = { create: PlusCircle, update: Edit3, delete: XCircle };
const ACTION_LABELS = { create: 'Создание', update: 'Изменение', delete: 'Удаление' };

export default function ActivityLog() {
  const navigate = useNavigate();
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]); // для имён сотрудников
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [quickPeriod, setQuickPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

  // Sort
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Selection
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // UI
  const [detailLog, setDetailLog] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'users' | 'trash'
  const [trashSearch, setTrashSearch] = useState('');
  const [trashEntity, setTrashEntity] = useState('all');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null); // для детального просмотра действий по сотруднику

  useEffect(() => {
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }

      if (biz) {
        setBusiness(biz);
        const [logsData, employeesData] = await Promise.all([
          base44.entities.ActivityLog.filter({ business_id: biz.id }),
          base44.entities.Employee.filter({ business_id: biz.id })
        ]);
        setLogs(logsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setEmployees(employeesData);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const setQuickDate = (period) => {
    setQuickPeriod(period);
    const now = new Date();
    if (period === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (period === 'week') setDateRange({ from: subDays(now, 7), to: endOfDay(now) });
    else if (period === 'month') setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    else if (period === 'all') setDateRange(null);
  };

  const handleRestore = async (log) => {
    if (!log.entity_data || log.action_type !== 'delete') return;
    if (!confirm('Восстановить эту запись?')) return;
    setRestoring(log.id);
    try {
      const entityMap = {
        Product: base44.entities.Product, Sale: base44.entities.Sale,
        Customer: base44.entities.Customer, Warehouse: base44.entities.Warehouse,
        Employee: base44.entities.Employee, Return: base44.entities.Return,
      };
      const entity = entityMap[log.entity_type];
      if (entity) {
        const { id, created_date, updated_date, ...restData } = log.entity_data;
        await entity.create(restData);
        await base44.entities.ActivityLog.update(log.id, { is_restored: true });
        setLogs(prev => prev.map(l => l.id === log.id ? { ...l, is_restored: true } : l));
        if (detailLog?.id === log.id) setDetailLog({ ...log, is_restored: true });
      }
    } catch (e) { alert('Ошибка при восстановлении'); }
    finally { setRestoring(null); }
  };

  const handleDeleteLog = async (logId) => {
    if (!confirm('Удалить эту запись из истории?')) return;
    setDeleting(logId);
    try {
      await base44.entities.ActivityLog.delete(logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
      setSelected(prev => { const n = new Set(prev); n.delete(logId); return n; });
      if (detailLog?.id === logId) setDetailLog(null);
    } finally { setDeleting(null); }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Удалить ${selected.size} записей из истории?`)) return;
    setBulkLoading(true);
    await Promise.all([...selected].map(id => base44.entities.ActivityLog.delete(id)));
    setLogs(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    setBulkLoading(false);
  };

  const handleBulkRestoreSelected = async () => {
    if (selected.size === 0) return;
    const toRestore = filteredLogs.filter(l => selected.has(l.id) && l.action_type === 'delete' && !l.is_restored && l.entity_data);
    if (toRestore.length === 0) { alert('Среди выбранных нет записей для восстановления'); return; }
    if (!confirm(`Восстановить ${toRestore.length} записей?`)) return;
    setBulkLoading(true);
    for (const log of toRestore) await handleRestoreSilent(log);
    setBulkLoading(false);
    setSelected(new Set());
  };

  const handleRestoreSilent = async (log) => {
    const entityMap = {
      Product: base44.entities.Product, Sale: base44.entities.Sale,
      Customer: base44.entities.Customer, Warehouse: base44.entities.Warehouse,
      Employee: base44.entities.Employee, Return: base44.entities.Return,
    };
    const entity = entityMap[log.entity_type];
    if (entity) {
      const { id, created_date, updated_date, ...restData } = log.entity_data;
      await entity.create(restData);
      await base44.entities.ActivityLog.update(log.id, { is_restored: true });
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, is_restored: true } : l));
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredLogs.length) setSelected(new Set());
    else setSelected(new Set(filteredLogs.map(l => l.id)));
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Helper: get display name for a user email
  const getUserLabel = (email, name) => {
    if (!email) return 'Система';
    if (name) return `${name} (${email})`;
    const emp = employees.find(e => e.user_email === email);
    if (emp) return `${emp.name} (${email})`;
    return email;
  };

  // Derived data
  const uniqueUsers = useMemo(() => [...new Set(logs.map(l => l.user_email).filter(Boolean))], [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.created_date);
      const matchesSearch = !search ||
        log.description?.toLowerCase().includes(search.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(search.toLowerCase());
      const matchesAction = filterAction === 'all' || log.action_type === filterAction;
      const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
      const matchesUser = filterUser === 'all' || log.user_email === filterUser;
      let matchesDate = true;
      if (dateRange?.from && dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = logDate >= new Date(dateRange.from) && logDate <= toDate;
      }
      return matchesSearch && matchesAction && matchesEntity && matchesUser && matchesDate;
    }).sort((a, b) => {
      let valA, valB;
      if (sortField === 'date') { valA = new Date(a.created_date); valB = new Date(b.created_date); }
      else if (sortField === 'action') { valA = a.action_type; valB = b.action_type; }
      else if (sortField === 'entity') { valA = a.entity_type; valB = b.entity_type; }
      else if (sortField === 'user') { valA = a.user_email || ''; valB = b.user_email || ''; }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [logs, search, filterAction, filterEntity, filterUser, dateRange, sortField, sortDir]);

  // User stats for "by user" tab — показываем ВСЕХ сотрудников + системные записи
  const userStats = useMemo(() => {
    const map = {};

    // Сначала добавляем всех сотрудников (даже без действий)
    employees.forEach(emp => {
      map[emp.user_email] = { email: emp.user_email, name: emp.name, total: 0, create: 0, update: 0, delete: 0, last: null };
    });

    // Потом заполняем данными из логов
    logs.forEach(log => {
      const u = log.user_email || 'Система';
      if (!map[u]) map[u] = { email: u, name: log.user_name || null, total: 0, create: 0, update: 0, delete: 0, last: null };
      map[u].total++;
      map[u][log.action_type] = (map[u][log.action_type] || 0) + 1;
      const d = new Date(log.created_date);
      if (!map[u].last || d > map[u].last) map[u].last = d;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [logs, employees]);

  const stats = useMemo(() => ({
    total: filteredLogs.length,
    creates: filteredLogs.filter(l => l.action_type === 'create').length,
    updates: filteredLogs.filter(l => l.action_type === 'update').length,
    deletes: filteredLogs.filter(l => l.action_type === 'delete').length,
    restored: filteredLogs.filter(l => l.is_restored).length,
  }), [filteredLogs]);

  const SortBtn = ({ field, label }) => (
    <button onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-all ${sortField === field ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
      {label}
      {sortField !== field ? <ArrowUpDown className="w-3 h-3" /> :
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
    </button>
  );

  if (!isReady || loading) return <BrandedLoader fullScreen message="Загрузка истории действий..." />;

  if (!can('view_activity_log')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <History className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Нет доступа</h3>
            <p className="text-slate-600">У вас нет прав для просмотра истории действий.<br/>Обратитесь к владельцу бизнеса.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('Settings'))} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Настройки
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" /> История действий
          </h1>
          <p className="text-xs text-slate-500">{logs.length} записей всего</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
          <RefreshCw className="w-4 h-4" /> Обновить
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'list', label: 'Список', icon: History },
          { key: 'users', label: 'По сотрудникам', icon: BarChart2 },
          { key: 'trash', label: `Корзина (${logs.filter(l => l.action_type === 'delete' && !l.is_restored).length})`, icon: Trash2 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' ? (
        /* ── USER STATS TAB ── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userStats.map(u => {
              const empName = u.name || employees.find(e => e.user_email === u.email)?.name;
              const noActions = u.total === 0;
              return (
                <div key={u.email} className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 ${noActions ? 'border-slate-100 opacity-70' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${noActions ? 'bg-slate-200' : 'bg-gradient-to-br from-indigo-400 to-purple-500'}`}>
                      <span className={`font-bold text-sm ${noActions ? 'text-slate-500' : 'text-white'}`}>{u.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {empName && <p className="font-semibold text-slate-900 text-sm truncate">{empName}</p>}
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      <p className={`text-xs font-medium mt-0.5 ${noActions ? 'text-slate-400 italic' : 'text-slate-400'}`}>
                        {noActions ? 'Нет действий' : `${u.total} действий`}
                      </p>
                    </div>
                    {!noActions && (
                      <button onClick={() => setSelectedUserEmail(selectedUserEmail === u.email ? null : u.email)}
                        className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex-shrink-0">
                        {selectedUserEmail === u.email ? 'Скрыть' : 'Детали'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-emerald-600">Создал</p>
                      <p className="text-lg font-bold text-emerald-700">{u.create || 0}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600">Изменил</p>
                      <p className="text-lg font-bold text-blue-700">{u.update || 0}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-red-600">Удалил</p>
                      <p className="text-lg font-bold text-red-700">{u.delete || 0}</p>
                    </div>
                  </div>
                  {!noActions && (
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      {u.create > 0 && <div className="bg-emerald-400 h-full" style={{ width: `${(u.create / u.total) * 100}%` }} />}
                      {u.update > 0 && <div className="bg-blue-400 h-full" style={{ width: `${(u.update / u.total) * 100}%` }} />}
                      {u.delete > 0 && <div className="bg-red-400 h-full" style={{ width: `${(u.delete / u.total) * 100}%` }} />}
                    </div>
                  )}
                  {u.last && <p className="text-xs text-slate-400">Последнее: {format(u.last, 'dd MMM yyyy, HH:mm', { locale: ru })}</p>}
                  {noActions && <p className="text-xs text-slate-300 text-center">— нет действий в системе —</p>}

                  {/* Детальный список последних действий */}
                  {selectedUserEmail === u.email && !noActions && (() => {
                    const userLogs = logs
                      .filter(l => l.user_email === u.email)
                      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                      .slice(0, 15);
                    return (
                      <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-600">Последние действия ({userLogs.length}):</p>
                          <button onClick={() => { setFilterUser(u.email); setActiveTab('list'); }}
                            className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                            Все → Список
                          </button>
                        </div>
                        {userLogs.map(log => {
                          const ActionIcon = ACTION_ICONS[log.action_type] || AlertCircle;
                          return (
                            <div key={log.id} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${ACTION_COLORS[log.action_type]}`}>
                              <ActionIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{log.description || `${ENTITY_LABELS[log.entity_type] || log.entity_type}`}</p>
                                <p className="opacity-70">{format(new Date(log.created_date), 'dd MMM, HH:mm', { locale: ru })}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
            {userStats.length === 0 && (
              <div className="col-span-3 text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Нет данных</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'trash' ? (
        /* ── TRASH TAB ── */
        (() => {
          const trashLogs = logs.filter(l => {
            if (l.action_type !== 'delete') return false;
            if (trashEntity !== 'all' && l.entity_type !== trashEntity) return false;
            if (trashSearch) {
              const q = trashSearch.toLowerCase();
              if (!l.description?.toLowerCase().includes(q) && !l.entity_type?.toLowerCase().includes(q) && !l.user_email?.toLowerCase().includes(q)) return false;
            }
            return true;
          }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

          const restored = trashLogs.filter(l => l.is_restored);
          const notRestored = trashLogs.filter(l => !l.is_restored);

          return (
            <div className="space-y-4">
              {/* Trash stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Всего удалено</p>
                  <p className="text-2xl font-bold text-red-600">{trashLogs.length}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Можно восстановить</p>
                  <p className="text-2xl font-bold text-amber-600">{notRestored.filter(l => l.entity_data).length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Восстановлено</p>
                  <p className="text-2xl font-bold text-emerald-600">{restored.length}</p>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input className="pl-9" placeholder="Поиск..." value={trashSearch} onChange={e => setTrashSearch(e.target.value)} />
                  {trashSearch && <button onClick={() => setTrashSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-400" /></button>}
                </div>
                <Select value={trashEntity} onValueChange={setTrashEntity}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Тип" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="Product">📦 Товары</SelectItem>
                    <SelectItem value="Sale">🛒 Продажи</SelectItem>
                    <SelectItem value="Customer">👤 Клиенты</SelectItem>
                    <SelectItem value="Warehouse">🏭 Склады</SelectItem>
                    <SelectItem value="Employee">👥 Сотрудники</SelectItem>
                    <SelectItem value="Return">↩️ Возвраты</SelectItem>
                  </SelectContent>
                </Select>
                {notRestored.filter(l => l.entity_data).length > 0 && (
                  <Button size="sm" variant="outline"
                    className="gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={async () => {
                      if (!confirm(`Восстановить всё (${notRestored.filter(l => l.entity_data).length} записей)?`)) return;
                      setBulkLoading(true);
                      for (const log of notRestored.filter(l => l.entity_data)) await handleRestoreSilent(log);
                      setBulkLoading(false);
                    }}
                    disabled={bulkLoading}>
                    <RotateCcw className="w-3.5 h-3.5" /> Восстановить всё
                  </Button>
                )}
              </div>

              {trashLogs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
                  <Trash2 className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Корзина пуста</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
                  {trashLogs.map(log => {
                    const Icon = ENTITY_ICONS[log.entity_type] || AlertCircle;
                    const data = log.entity_data;
                    return (
                      <div key={log.id} className={`p-3 sm:p-4 flex items-start gap-3 ${log.is_restored ? 'bg-emerald-50/40 opacity-60' : 'hover:bg-slate-50'}`}>
                        <div className={`p-2 rounded-xl flex-shrink-0 border ${log.is_restored ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {ENTITY_LABELS[log.entity_type] || log.entity_type}
                            </span>
                            {log.is_restored && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Восстановлено
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 font-medium">
                            {data ? (
                              log.entity_type === 'Product' ? `${data.brand || ''} ${data.model || ''}`.trim() :
                              log.entity_type === 'Customer' ? data.name || '—' :
                              log.entity_type === 'Sale' ? `Продажа ${data.boxes_sold || 0} кор. — ${data.total_amount || 0} с.` :
                              log.entity_type === 'Warehouse' ? data.name || '—' :
                              log.description
                            ) : log.description}
                          </p>
                          {data && log.entity_type === 'Product' && (
                            <p className="text-xs text-slate-400 mt-0.5">{data.color} · {data.product_type} · {data.boxes_in_stock || 0} кор. в наличии</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />{getUserLabel(log.user_email, log.user_name)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(log.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!log.is_restored && data && (
                            <button onClick={() => handleRestore(log)} disabled={restoring === log.id}
                              className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1 font-medium">
                              <RotateCcw className={`w-3.5 h-3.5 ${restoring === log.id ? 'animate-spin' : ''}`} />
                              Восстановить
                            </button>
                          )}
                          <button onClick={() => handleDeleteLog(log.id)} disabled={deleting === log.id}
                            className="p-1.5 hover:bg-red-50 rounded-lg">
                            <Trash2 className={`w-4 h-4 text-red-400 ${deleting === log.id ? 'animate-pulse' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        /* ── LIST TAB ── */
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { label: 'Всего', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', action: 'all' },
              { label: 'Создано', value: stats.creates, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', action: 'create' },
              { label: 'Изменено', value: stats.updates, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', action: 'update' },
              { label: 'Удалено', value: stats.deletes, color: 'text-red-700', bg: 'bg-red-50 border-red-200', action: 'delete' },
              { label: 'Восстановлено', value: stats.restored, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', action: null },
            ].map(s => (
              <div key={s.label}
                onClick={() => s.action !== null && setFilterAction(s.action === filterAction && s.action !== 'all' ? 'all' : s.action)}
                className={`rounded-xl border p-3 cursor-pointer hover:opacity-80 transition-opacity ${s.bg} ${filterAction === s.action && s.action ? 'ring-2 ring-indigo-400' : ''}`}>
                <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            {/* Quick period buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'today', label: 'Сегодня' },
                { key: 'week', label: '7 дней' },
                { key: 'month', label: 'Месяц' },
                { key: 'all', label: 'Все время' },
              ].map(p => (
                <button key={p.key} onClick={() => setQuickDate(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${quickPeriod === p.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Search + dropdowns */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input className="pl-9" placeholder="Поиск по описанию, типу, email..." value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-400" /></button>}
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Действие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все действия</SelectItem>
                  <SelectItem value="create">✅ Создание</SelectItem>
                  <SelectItem value="update">✏️ Изменение</SelectItem>
                  <SelectItem value="delete">🗑 Удаление</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="Product">📦 Товары</SelectItem>
                  <SelectItem value="Sale">🛒 Продажи</SelectItem>
                  <SelectItem value="Customer">👤 Клиенты</SelectItem>
                  <SelectItem value="Warehouse">🏭 Склады</SelectItem>
                  <SelectItem value="Employee">👥 Сотрудники</SelectItem>
                  <SelectItem value="Return">↩️ Возвраты</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Сотрудник" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все сотрудники</SelectItem>
                  {uniqueUsers.map(u => (
                    <SelectItem key={u} value={u}>{getUserLabel(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Active filters chips */}
              <div className="flex flex-wrap gap-1">
                {filterAction !== 'all' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                    {ACTION_LABELS[filterAction]}
                    <button onClick={() => setFilterAction('all')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filterEntity !== 'all' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                    {ENTITY_LABELS[filterEntity]}
                    <button onClick={() => setFilterEntity('all')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filterUser !== 'all' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs max-w-[200px] truncate">
                    {getUserLabel(filterUser)}
                    <button onClick={() => setFilterUser('all')}><X className="w-3 h-3 flex-shrink-0" /></button>
                  </span>
                )}
              </div>
            </div>

            {/* Sort + select toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">Сортировка:</span>
              <SortBtn field="date" label="Дата" />
              <SortBtn field="action" label="Действие" />
              <SortBtn field="entity" label="Тип" />
              <SortBtn field="user" label="Сотрудник" />

              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${selectMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                  <CheckSquare className="w-3.5 h-3.5" /> {selectMode ? 'Отменить выбор' : 'Выбрать'}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectMode && selected.size > 0 && (
            <div className="bg-indigo-600 text-white rounded-2xl p-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold">Выбрано: {selected.size}</span>
              <Button size="sm" variant="secondary" onClick={handleBulkRestoreSelected} disabled={bulkLoading} className="gap-1 bg-white/20 hover:bg-white/30 text-white border-white/30">
                <RotateCcw className="w-3.5 h-3.5" /> Восстановить выбранные
              </Button>
              <Button size="sm" variant="secondary" onClick={handleBulkDelete} disabled={bulkLoading} className="gap-1 bg-red-500 hover:bg-red-600 text-white border-transparent">
                <Trash2 className="w-3.5 h-3.5" /> Удалить выбранные
              </Button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Log list */}
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 text-center py-16">
              <History className="w-14 h-14 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">История пуста</p>
              <p className="text-slate-400 text-sm mt-1">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* List header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50">
                {selectMode && (
                  <button onClick={toggleSelectAll} className="flex-shrink-0">
                    {selected.size === filteredLogs.length
                      ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                      : <Square className="w-4 h-4 text-slate-400" />}
                  </button>
                )}
                <span className="text-xs text-slate-500 font-medium flex-1">{filteredLogs.length} записей</span>
                <button onClick={async () => {
                  if (!confirm(`Очистить ${filteredLogs.length} записей?`)) return;
                  setBulkLoading(true);
                  await Promise.all(filteredLogs.map(l => base44.entities.ActivityLog.delete(l.id)));
                  await loadData();
                  setBulkLoading(false);
                }} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Очистить всё
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const Icon = ENTITY_ICONS[log.entity_type] || AlertCircle;
                  const ActionIcon = ACTION_ICONS[log.action_type] || AlertCircle;
                  const isSelected = selected.has(log.id);
                  return (
                    <div key={log.id}
                      onClick={selectMode ? () => toggleSelect(log.id) : undefined}
                      className={`p-3 sm:p-4 transition-colors flex items-start gap-3 ${log.is_restored ? 'bg-emerald-50/40' : ''} ${selectMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>

                      {selectMode && (
                        <div className="flex-shrink-0 mt-0.5">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </div>
                      )}

                      <div className={`p-2 rounded-xl flex-shrink-0 border ${ACTION_COLORS[log.action_type]}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${ACTION_COLORS[log.action_type]}`}>
                            {ACTION_LABELS[log.action_type]}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Icon className="w-3 h-3" />
                            {ENTITY_LABELS[log.entity_type] || log.entity_type}
                          </span>
                          {log.is_restored && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Восстановлено
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700">{log.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setFilterUser(log.user_email); }}
                            className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                            <User className="w-3 h-3" />
                            {getUserLabel(log.user_email, log.user_name)}
                          </button>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(log.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                          </span>
                        </div>
                      </div>

                      {!selectMode && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {log.entity_data && (
                            <button onClick={() => setDetailLog(log)} className="p-2 hover:bg-indigo-50 rounded-lg" title="Подробности">
                              <Eye className="w-4 h-4 text-indigo-500" />
                            </button>
                          )}
                          {log.action_type === 'delete' && !log.is_restored && log.entity_data && (
                            <button onClick={() => handleRestore(log)} disabled={restoring === log.id} className="p-2 hover:bg-emerald-50 rounded-lg" title="Восстановить">
                              <RotateCcw className={`w-4 h-4 text-emerald-600 ${restoring === log.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteLog(log.id)} disabled={deleting === log.id} className="p-2 hover:bg-red-50 rounded-lg" title="Удалить">
                            <Trash2 className={`w-4 h-4 text-red-400 ${deleting === log.id ? 'animate-pulse' : ''}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailLog && (() => {
                const ActionIcon = ACTION_ICONS[detailLog.action_type] || AlertCircle;
                return (
                  <>
                    <span className={`p-1.5 rounded-lg border ${ACTION_COLORS[detailLog.action_type]}`}>
                      <ActionIcon className="w-4 h-4" />
                    </span>
                    {ACTION_LABELS[detailLog.action_type]} · {ENTITY_LABELS[detailLog.entity_type] || detailLog.entity_type}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Кто:</span>
                  <span className="font-semibold text-slate-800">{getUserLabel(detailLog.user_email, detailLog.user_name)}</span>
                  <button onClick={() => { setFilterUser(detailLog.user_email); setDetailLog(null); }}
                    className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 px-2 py-0.5 bg-indigo-50 rounded">
                    Фильтровать по сотруднику
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Когда:</span>
                  <span className="font-semibold text-slate-800">{format(parseISO(detailLog.created_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}</span>
                </div>
                {detailLog.description && (
                  <p className="text-slate-600 pt-1 border-t border-slate-200">{detailLog.description}</p>
                )}
              </div>

              {detailLog.action_type === 'update' && detailLog.entity_data?.changes && Object.keys(detailLog.entity_data.changes).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Что изменилось:</p>
                  <div className="space-y-2">
                    {Object.values(detailLog.entity_data.changes).map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                        <span className="text-sm text-slate-500 w-28 flex-shrink-0 font-medium">{c.label}</span>
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-lg text-xs line-through">{c.from}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-lg text-xs font-semibold">{c.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailLog.entity_data && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {detailLog.action_type === 'delete' ? 'Данные удалённой записи:' : 'Данные записи:'}
                  </p>
                  <ProductPhoto
                    photoUrl={detailLog.entity_data.photo_url}
                    brand={detailLog.entity_data.brand}
                    className="w-full h-40 rounded-xl mb-3"
                    textClassName="text-xl"
                  />
                  <div className="space-y-1 bg-slate-50 rounded-xl p-3">
                    {Object.entries(detailLog.entity_data)
                      .filter(([k]) => !['id', 'created_date', 'updated_date', 'business_id', 'photo_url', 'changes', 'edit_history'].includes(k))
                      .map(([key, val]) => val != null && val !== '' && (
                        <div key={key} className="flex gap-2 py-1 border-b border-slate-100 last:border-0 text-sm">
                          <span className="text-slate-400 w-36 flex-shrink-0 font-mono text-xs pt-0.5">{key}</span>
                          <span className="text-slate-800 font-medium break-all">
                            {typeof val === 'boolean' ? (val ? '✅ Да' : '❌ Нет') :
                              typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {detailLog.is_restored && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> Эта запись была восстановлена
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDetailLog(null)}>Закрыть</Button>
                {detailLog.action_type === 'delete' && !detailLog.is_restored && detailLog.entity_data && (
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                    disabled={restoring === detailLog.id}
                    onClick={() => handleRestore(detailLog)}>
                    <RotateCcw className="w-4 h-4" /> Восстановить
                  </Button>
                )}
                <button onClick={() => { handleDeleteLog(detailLog.id); }}
                  className="p-2 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}