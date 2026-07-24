import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SearchInput from '@/components/filters/SearchInput';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Users, ChevronLeft, ChevronRight,
  UserCheck, CreditCard, Wallet, ShoppingCart, TrendingUp
} from 'lucide-react';
import CustomerForm from '@/components/customers/CustomerForm';
import CustomerDetail from '@/components/customers/CustomerDetail';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';

const PAGE_SIZE = 20;

export default function Customers() {
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDebt, setFilterDebt] = useState('all'); // all, with_debt, no_debt
  const [filterEmployee, setFilterEmployee] = useState('all'); // all, or employee email/id
  const [sortBy, setSortBy] = useState('date_desc'); // name, date_desc, date_asc, debt_desc, debt_asc
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      let biz = null;
      const savedMode = localStorage.getItem('barakatcrm_mode') || sessionStorage.getItem('barakatcrm_mode');
      if (savedMode && savedMode.startsWith('employee_')) {
        const empId = savedMode.replace('employee_', '');
        const empRecords = await base44.entities.Employee.filter({ user_email: currentUser.email, is_active: true });
        const emp = empRecords.find(e => e.id === empId) || empRecords[0];
        if (emp && !emp.is_frozen) {
          const bizList = await base44.entities.Business.filter({ id: emp.business_id });
          if (bizList.length > 0) biz = bizList[0];
        }
      }
      if (!biz) {
        const businesses = await base44.entities.Business.filter({ owner_email: currentUser.email });
        if (businesses.length > 0) biz = businesses[0];
      }

      if (biz) {
        setBusiness(biz);
        const [customersData, empData] = await Promise.all([
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.Employee.filter({ business_id: biz.id, is_active: true })
        ]);
        setCustomers(customersData);
        setEmployees(empData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserContext = () => {
    const emp = window.__barakatEmployee;
    if (emp) {
      return {
        added_by_employee_id: emp.id,
        added_by_employee_name: emp.name,
        added_by_email: emp.user_email,
        added_by_role: emp.is_admin ? 'admin' : 'employee'
      };
    } else {
      // Owner
      return {
        added_by_employee_id: '',
        added_by_employee_name: user?.full_name || user?.email || 'Владелец',
        added_by_email: user?.email || '',
        added_by_role: 'owner'
      };
    }
  };

  const handleSave = async (formData) => {
    const userContext = getCurrentUserContext();
    const data = { ...formData, business_id: business.id };

    if (editingCustomer) {
      await base44.entities.Customer.update(editingCustomer.id, data);
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...data } : c));
      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer(prev => ({ ...prev, ...data }));
      }
    } else {
      await base44.entities.Customer.create({
        ...data,
        ...userContext,
        total_debt: 0,
        total_paid: 0,
        purchase_count: 0
      });
      await loadData();
    }
    setEditingCustomer(null);
  };

  const handleDelete = async (customerId) => {
    if (!confirm('Удалить этого клиента? Все его долги и платежи тоже будут удалены.')) return;
    const debtSales = await base44.entities.Sale.filter({ customer_id: customerId, is_debt: true });
    for (const sale of debtSales) {
      await base44.entities.Sale.delete(sale.id);
    }
    const payments = await base44.entities.DebtPayment.filter({ customer_id: customerId });
    for (const payment of payments) {
      await base44.entities.DebtPayment.delete(payment.id);
    }
    await base44.entities.Customer.delete(customerId);
    await loadData();
  };

  // ===== Summary Stats =====
  const stats = useMemo(() => {
    const total = customers.length;
    const withDebt = customers.filter(c => (c.total_debt || 0) > 0).length;
    const noDebt = total - withDebt;
    const totalDebtAmount = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
    const totalPaidAmount = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);
    const withPurchases = customers.filter(c => (c.purchase_count || 0) > 0).length;
    return { total, withDebt, noDebt, totalDebtAmount, totalPaidAmount, withPurchases };
  }, [customers]);

  // ===== Filtering + Sorting =====
  const filteredCustomers = useMemo(() => {
    let result = customers.filter(customer => {
      const matchesSearch = !search ||
        customer.name?.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone?.includes(search);

      const matchesDebt =
        filterDebt === 'all' ||
        (filterDebt === 'with_debt' && (customer.total_debt || 0) > 0) ||
        (filterDebt === 'no_debt' && (customer.total_debt || 0) === 0);

      const matchesEmployee =
        filterEmployee === 'all' ||
        customer.added_by_email === filterEmployee ||
        customer.added_by_employee_id === filterEmployee;

      return matchesSearch && matchesDebt && matchesEmployee;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': return new Date(b.created_date || 0) - new Date(a.created_date || 0);
        case 'date_asc': return new Date(a.created_date || 0) - new Date(b.created_date || 0);
        case 'debt_desc': return (b.total_debt || 0) - (a.total_debt || 0);
        case 'debt_asc': return (a.total_debt || 0) - (b.total_debt || 0);
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result;
  }, [customers, search, filterDebt, filterEmployee, sortBy]);

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const paginatedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Unique employees who added clients (from customer records)
  const employeesWhoAdded = useMemo(() => {
    const map = new Map();
    customers.forEach(c => {
      const key = c.added_by_email || c.added_by_employee_id;
      if (key && !map.has(key)) {
        map.set(key, {
          id: c.added_by_employee_id,
          email: c.added_by_email,
          name: c.added_by_employee_name || c.added_by_email || 'Неизвестно',
          role: c.added_by_role
        });
      }
    });
    return Array.from(map.values());
  }, [customers]);

  const getEmployeeLabel = (email) => {
    const emp = employeesWhoAdded.find(e => e.email === email || e.id === email);
    return emp?.name || email;
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!can('view_customers')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Нет доступа</h3>
            <p className="text-slate-600 dark:text-slate-400">У вас нет прав для просмотра клиентов.<br />Обратитесь к владельцу бизнеса.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // ===== Detail View =====
  if (selectedCustomer) {
    return (
      <PullToRefresh onRefresh={loadData}>
        <CustomerDetail
          customer={selectedCustomer}
          business={business}
          onBack={() => setSelectedCustomer(null)}
          onEdit={(c) => { setEditingCustomer(c); setFormOpen(true); }}
          onDelete={handleDelete}
        />
        <CustomerForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
          onSave={handleSave}
          editingCustomer={editingCustomer}
          business={business}
        />
      </PullToRefresh>
    );
  }

  // ===== Main List View =====
  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Клиенты</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Всего {stats.total} · долг {stats.totalDebtAmount.toLocaleString()} с.
            </p>
          </div>
          {can('manage_customers') && (
            <Button onClick={() => { setEditingCustomer(null); setFormOpen(true); }} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Добавить
            </Button>
          )}
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Всего</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-1">
              <CreditCard className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.withDebt}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">С долгом</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.noDebt}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Без долга</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-1">
              <ShoppingCart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.withPurchases}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Покупали</p>
          </div>
        </div>

        {/* Total debt + paid amounts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Общий долг клиентов</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.totalDebtAmount.toLocaleString()} с.</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Всего оплачено клиентами</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.totalPaidAmount.toLocaleString()} с.</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Поиск по имени или телефону..." className="flex-1 min-w-36" />

          <Select value={filterDebt} onValueChange={(v) => { setFilterDebt(v); setPage(1); }}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="with_debt">С долгом</SelectItem>
              <SelectItem value="no_debt">Без долга</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEmployee} onValueChange={(v) => { setFilterEmployee(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employeesWhoAdded.map(emp => (
                <SelectItem key={emp.email || emp.id} value={emp.email || emp.id}>
                  {emp.role === 'owner' ? '👑 ' : emp.role === 'admin' ? '🛡️ ' : '👤 '}{emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Новые сначала</SelectItem>
              <SelectItem value="date_asc">Старые сначала</SelectItem>
              <SelectItem value="name">По имени (А-Я)</SelectItem>
              <SelectItem value="debt_desc">Долг ↓</SelectItem>
              <SelectItem value="debt_asc">Долг ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-xs text-slate-400 dark:text-slate-500 px-1">
          Показано {filteredCustomers.length} из {stats.total}
        </div>

        {/* Customer List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedCustomers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Клиенты не найдены</p>
              <p className="text-xs mt-1">Попробуйте изменить фильтры</p>
            </div>
          ) : paginatedCustomers.map(customer => {
            const addedByName = customer.added_by_employee_name || customer.added_by_email;
            return (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{customer.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  {(customer.total_debt || 0) > 0 && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white dark:border-slate-900" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{customer.name}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {can('view_customer_contacts') ? customer.phone : '•••'}
                    </p>
                    {addedByName && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 truncate">
                          <UserCheck className="w-2.5 h-2.5" />
                          {addedByName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Debt / Status */}
                <div className="text-right flex-shrink-0">
                  {can('view_customer_debt') ? (
                    (customer.total_debt || 0) > 0 ? (
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{(customer.total_debt || 0).toLocaleString()} с.</p>
                    ) : (
                      <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">✓ нет долга</p>
                    )
                  ) : (
                    <p className="text-xs text-slate-300">•••</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 py-2.5 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-slate-400 dark:text-slate-500 px-3 font-medium">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <CustomerForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
          onSave={handleSave}
          editingCustomer={editingCustomer}
          business={business}
        />
      </div>
    </PullToRefresh>
  );
}