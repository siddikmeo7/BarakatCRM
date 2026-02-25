import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import SearchInput from '@/components/filters/SearchInput';
import DateFilter from '@/components/filters/DateFilter';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  History, RotateCcw, Trash2, Package, ShoppingCart, Users, AlertCircle, Eye, 
  ArrowLeft, Database, Filter, RefreshCw, Download, User, Clock, ChevronRight,
  CheckCircle2, XCircle, Edit3, PlusCircle
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

const ENTITY_ICONS = {
  Product: Package,
  Sale: ShoppingCart,
  Customer: Users,
  Warehouse: Database,
  Employee: Users,
  Return: RotateCcw
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

const ACTION_ICONS = {
  create: PlusCircle,
  update: Edit3,
  delete: XCircle
};

const ACTION_LABELS = { create: 'Создание', update: 'Изменение', delete: 'Удаление' };

export default function ActivityLog() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [detailLog, setDetailLog] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [quickPeriod, setQuickPeriod] = useState('month');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      if (businesses.length > 0) {
        const biz = businesses[0];
        setBusiness(biz);
        const logsData = await base44.entities.ActivityLog.filter({ business_id: biz.id });
        setLogs(logsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
        Product: base44.entities.Product,
        Sale: base44.entities.Sale,
        Customer: base44.entities.Customer,
        Warehouse: base44.entities.Warehouse,
        Employee: base44.entities.Employee,
        Return: base44.entities.Return,
      };
      const entity = entityMap[log.entity_type];
      if (entity) {
        const { id, created_date, updated_date, ...restData } = log.entity_data;
        await entity.create(restData);
        await base44.entities.ActivityLog.update(log.id, { is_restored: true });
        setLogs(prev => prev.map(l => l.id === log.id ? { ...l, is_restored: true } : l));
        if (detailLog?.id === log.id) setDetailLog({ ...log, is_restored: true });
      }
    } catch (e) {
      alert('Ошибка при восстановлении');
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!confirm('Удалить эту запись из истории?')) return;
    setDeleting(logId);
    try {
      await base44.entities.ActivityLog.delete(logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
      if (detailLog?.id === logId) setDetailLog(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Очистить ${filteredLogs.length} записей из истории? Это действие нельзя отменить.`)) return;
    await Promise.all(filteredLogs.map(l => base44.entities.ActivityLog.delete(l.id)));
    await loadData();
  };

  // Фильтрация
  const uniqueUsers = [...new Set(logs.map(l => l.user_email).filter(Boolean))];

  const filteredLogs = logs.filter(log => {
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
  });

  // Статистика
  const stats = {
    total: filteredLogs.length,
    creates: filteredLogs.filter(l => l.action_type === 'create').length,
    updates: filteredLogs.filter(l => l.action_type === 'update').length,
    deletes: filteredLogs.filter(l => l.action_type === 'delete').length,
    restored: filteredLogs.filter(l => l.is_restored).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('Settings'))} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Настройки
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" /> История действий
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{logs.length} записей всего</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
          <RefreshCw className="w-4 h-4" /> Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Всего', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Создано', value: stats.creates, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Изменено', value: stats.updates, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Удалено', value: stats.deletes, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Восстановлено', value: stats.restored, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
            <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        {/* Quick period */}
        <div className="flex flex-wrap gap-2 items-center">
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
          <DateFilter dateRange={dateRange} onDateRangeChange={r => { setDateRange(r); setQuickPeriod(''); }} />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Поиск по описанию, типу, пользователю..."
            className="w-full sm:w-72"
          />
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
          {uniqueUsers.length > 1 && (
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Пользователь" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {uniqueUsers.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {filteredLogs.length > 0 && (
            <button onClick={handleClearAll} className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Очистить ({filteredLogs.length})
            </button>
          )}
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 text-center py-16">
          <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">История пуста</p>
          <p className="text-slate-400 text-sm mt-1">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredLogs.map(log => {
              const Icon = ENTITY_ICONS[log.entity_type] || AlertCircle;
              const ActionIcon = ACTION_ICONS[log.action_type] || AlertCircle;
              const isDeleting = deleting === log.id;
              const isRestoring = restoring === log.id;
              return (
                <div key={log.id} className={`p-4 hover:bg-slate-50 transition-colors ${log.is_restored ? 'bg-emerald-50/40' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-xl flex-shrink-0 border ${ACTION_COLORS[log.action_type]}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    {/* Content */}
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
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Восстановлено
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{log.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.user_email || 'Система'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(log.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {log.entity_data && (
                        <button onClick={() => setDetailLog(log)}
                          className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Подробности">
                          <Eye className="w-4 h-4 text-indigo-500" />
                        </button>
                      )}
                      {log.action_type === 'delete' && !log.is_restored && log.entity_data && (
                        <button onClick={() => handleRestore(log)} disabled={isRestoring}
                          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Восстановить">
                          <RotateCcw className={`w-4 h-4 text-emerald-600 ${isRestoring ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteLog(log.id)} disabled={isDeleting}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить запись">
                        <Trash2 className={`w-4 h-4 text-red-400 ${isDeleting ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
              {/* Meta info */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Кто:</span>
                  <span className="font-semibold text-slate-800">{detailLog.user_email || 'Система'}</span>
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

              {/* Changes for update */}
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

              {/* Entity data fields */}
              {detailLog.entity_data && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {detailLog.action_type === 'delete' ? 'Данные удалённой записи:' : 'Данные записи:'}
                  </p>
                  {detailLog.entity_data.photo_url && (
                    <img src={detailLog.entity_data.photo_url} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
                  )}
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
                <button onClick={() => { handleDeleteLog(detailLog.id); setDetailLog(null); }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                  title="Удалить из истории">
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