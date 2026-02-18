import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import DateFilter from '@/components/filters/DateFilter';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, RotateCcw, Trash2, Package, ShoppingCart, Users, AlertCircle, Eye, ArrowLeft } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

const ENTITY_ICONS = {
  Product: Package,
  Sale: ShoppingCart,
  Customer: Users,
  Warehouse: Package,
  Employee: Users
};

export default function ActivityLog() {
  const [business, setBusiness] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (log) => {
    if (!log.entity_data || log.action_type !== 'delete') return;
    
    if (confirm(`Восстановить ${log.entity_type}?`)) {
      try {
        // Восстановление зависит от типа сущности
        const entityMap = {
          Product: base44.entities.Product,
          Sale: base44.entities.Sale,
          Customer: base44.entities.Customer,
          Warehouse: base44.entities.Warehouse,
          Employee: base44.entities.Employee
        };
        
        const entity = entityMap[log.entity_type];
        if (entity) {
          await entity.create(log.entity_data);
          await base44.entities.ActivityLog.update(log.id, { is_restored: true });
          await loadData();
        }
      } catch (error) {
        console.error('Error restoring:', error);
        alert('Ошибка при восстановлении');
      }
    }
  };

  const handleDeleteLog = async (logId) => {
    if (confirm('Удалить эту запись из истории?')) {
      await base44.entities.ActivityLog.delete(logId);
      await loadData();
    }
  };

  // Фильтрация
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.created_date);
    const matchesSearch = 
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action_type === filterAction;
    const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
    
    // Безопасная проверка дат
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = logDate >= fromDate && logDate <= toDate;
    }
    
    return matchesSearch && matchesAction && matchesEntity && matchesDate;
  });

  const actionLabels = {
    create: 'Создание',
    update: 'Изменение',
    delete: 'Удаление'
  };

  const actionColors = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="История действий"
        subtitle={`${logs.length} записей`}
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Поиск в истории..."
            className="w-full sm:w-64"
          />
          <DateFilter value={dateRange} onChange={setDateRange} />
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Действие" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все действия</SelectItem>
              <SelectItem value="create">Создание</SelectItem>
              <SelectItem value="update">Изменение</SelectItem>
              <SelectItem value="delete">Удаление</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="Product">Товары</SelectItem>
              <SelectItem value="Sale">Продажи</SelectItem>
              <SelectItem value="Customer">Клиенты</SelectItem>
              <SelectItem value="Warehouse">Склады</SelectItem>
              <SelectItem value="Employee">Сотрудники</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.map(log => {
            const Icon = ENTITY_ICONS[log.entity_type] || AlertCircle;
            
            return (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${actionColors[log.action_type]}`}>
                            {actionLabels[log.action_type]}
                          </span>
                          <span className="text-sm font-medium text-slate-900">{log.entity_type}</span>
                          {log.is_restored && (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                              Восстановлено
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{log.description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {log.user_email} • {format(parseISO(log.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {log.action_type === 'delete' && !log.is_restored && log.entity_data && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(log)}
                            className="gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Восстановить
                          </Button>
                        )}
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">История действий пуста</p>
          </div>
        )}
      </div>
    </div>
  );
}