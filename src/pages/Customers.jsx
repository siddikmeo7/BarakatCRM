import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ViewToggle from '@/components/ui/ViewToggle';
import { 
  Plus, 
  Users, 
  Edit2, 
  Trash2, 
  Phone,
  Mail,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

const PAGE_SIZE = 20;

import { t } from '@/components/i18n/translations';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';

export default function Customers() {
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [filterDebt, setFilterDebt] = useState('all'); // all, with_debt, no_debt
  const [sortBy, setSortBy] = useState('name'); // name, debt_desc, debt_asc, paid_desc
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    email: '',
    address: '',
    use_phone_for_all: true,
    debt_limit: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      let biz = null;
      const savedMode = localStorage.getItem('barakatcrm_mode') || sessionStorage.getItem('barakatcrm_mode');
      if (savedMode && savedMode.startsWith('employee_')) {
        const empId = savedMode.replace('employee_', '');
        const empRecords = await base44.entities.Employee.filter({ user_email: user.email, is_active: true });
        const emp = empRecords.find(e => e.id === empId) || empRecords[0];
        if (emp && !emp.is_frozen) {
          const bizList = await base44.entities.Business.filter({ id: emp.business_id });
          if (bizList.length > 0) biz = bizList[0];
        }
      }
      if (!biz) {
        const businesses = await base44.entities.Business.filter({ owner_email: user.email });
        if (businesses.length > 0) biz = businesses[0];
      }
      
      if (biz) {
        setBusiness(biz);
        
        const customersData = await base44.entities.Customer.filter({ business_id: biz.id });
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        telegram: customer.telegram || '',
        email: customer.email || '',
        address: customer.address || '',
        use_phone_for_all: customer.use_phone_for_all !== false,
        debt_limit: customer.debt_limit || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ 
        name: '', 
        phone: '', 
        whatsapp: '', 
        telegram: '', 
        email: '', 
        address: '',
        use_phone_for_all: true,
        debt_limit: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { 
        ...formData, 
        business_id: business.id,
        debt_limit: formData.debt_limit ? parseFloat(formData.debt_limit) : null
      };
      
      if (editingCustomer) {
        await base44.entities.Customer.update(editingCustomer.id, data);
      } else {
        await base44.entities.Customer.create({
          ...data,
          total_debt: 0,
          total_paid: 0
        });
      }
      
      await loadData();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (confirm('Удалить этого клиента? Все его долги и платежи тоже будут удалены.')) {
      // Удаляем связанные продажи в долг
      const debtSales = await base44.entities.Sale.filter({ customer_id: customerId, is_debt: true });
      for (const sale of debtSales) {
        await base44.entities.Sale.delete(sale.id);
      }
      // Удаляем связанные платежи по долгам
      const payments = await base44.entities.DebtPayment.filter({ customer_id: customerId });
      for (const payment of payments) {
        await base44.entities.DebtPayment.delete(payment.id);
      }
      // Удаляем самого клиента
      await base44.entities.Customer.delete(customerId);
      await loadData();
    }
  };

  // Фильтрация + сортировка + пагинация
  let filteredCustomers = customers.filter(customer => {
    const matchesSearch = !search ||
      customer.name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone?.includes(search);
    const matchesDebt =
      filterDebt === 'all' ||
      (filterDebt === 'with_debt' && (customer.total_debt || 0) > 0) ||
      (filterDebt === 'no_debt' && (customer.total_debt || 0) === 0);
    return matchesSearch && matchesDebt;
  });

  filteredCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'debt_desc': return (b.total_debt || 0) - (a.total_debt || 0);
      case 'debt_asc': return (a.total_debt || 0) - (b.total_debt || 0);
      case 'paid_desc': return (b.total_paid || 0) - (a.total_paid || 0);
      default: return (a.name || '').localeCompare(b.name || '');
    }
  });

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const paginatedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Итоги
  const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);

  if (!isReady) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  if (!can('view_customers')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Нет доступа</h3>
            <p className="text-slate-600">У вас нет прав для просмотра клиентов.<br/>Обратитесь к владельцу бизнеса.</p>
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

  // Detail view
  if (selectedCustomer) {
    const c = selectedCustomer;
    const whatsappNum = c.use_phone_for_all ? c.phone : (c.whatsapp || c.phone);
    const telegramNum = c.use_phone_for_all ? c.phone : (c.telegram || c.phone);
    return (
      <PullToRefresh onRefresh={loadData}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCustomer(null)} className="p-2 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{c.name}</h1>
            <p className="text-xs text-slate-400">{c.phone}</p>
          </div>
          <div className="flex gap-1">
            {can('manage_customers') && (
              <button onClick={() => { handleOpenDialog(c); }} className="p-2 hover:bg-slate-100 rounded-lg"><Edit2 className="w-4 h-4 text-slate-500" /></button>
            )}
            {can('delete_customers') && (
              <button onClick={() => { handleDelete(c.id); setSelectedCustomer(null); }} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
            <p className="text-xs text-slate-400">Долг</p>
            {can('view_customer_debt') ? (
              <>
                <p className="text-xl font-bold text-orange-600">{(c.total_debt||0).toLocaleString()} с.</p>
                {c.debt_limit && <p className="text-xs text-slate-400">Лимит: {c.debt_limit.toLocaleString()} с.</p>}
              </>
            ) : (
              <p className="text-xl font-bold text-slate-300">•••</p>
            )}
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="text-xs text-slate-400">Оплачено</p>
            {can('view_customer_debt') ? (
              <p className="text-xl font-bold text-emerald-600">{(c.total_paid||0).toLocaleString()} с.</p>
            ) : (
              <p className="text-xl font-bold text-slate-300">•••</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2">
          {c.phone && <p className="flex items-center gap-2 text-sm text-slate-600"><Phone className="w-4 h-4 text-slate-400" />{c.phone}</p>}
          {c.email && <p className="flex items-center gap-2 text-sm text-slate-600"><Mail className="w-4 h-4 text-slate-400" />{c.email}</p>}
          {c.address && <p className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-4 h-4 text-slate-400" />{c.address}</p>}
        </div>
        <div className="flex gap-2">
          <a href={`https://wa.me/${whatsappNum?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 text-sm font-medium">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <a href={`https://t.me/${telegramNum?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 text-sm font-medium">
            <Send className="w-4 h-4" /> Telegram
          </a>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingCustomer ? 'Редактировать' : 'Добавить'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Имя *</Label><Input value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} className="mt-1.5" /></div>
              <div><Label>Телефон *</Label><Input value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} className="mt-1.5" /></div>
              <div><Label>Адрес</Label><Input value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})} className="mt-1.5" /></div>
              <div><Label>Лимит долга</Label><Input type="text" inputMode="decimal" value={formData.debt_limit} onChange={e=>setFormData({...formData,debt_limit:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Не ограничен" className="mt-1.5" /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={()=>setDialogOpen(false)}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving||!formData.name||!formData.phone} className="bg-indigo-600 hover:bg-indigo-700">
                {saving?<Loader2 className="w-4 h-4 animate-spin" />:'Сохранить'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Клиенты</h1>
          <p className="text-xs text-slate-400">{customers.length} · долг {totalDebt.toLocaleString()} с.</p>
        </div>
        {(can('manage_customers') || can('delete_customers')) && (
          can('manage_customers') && (
            <Button onClick={() => handleOpenDialog()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Добавить
            </Button>
          )
        )}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Поиск..." className="flex-1 min-w-36" />
        <Select value={filterDebt} onValueChange={(v) => { setFilterDebt(v); setPage(1); }}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="with_debt">С долгом</SelectItem>
            <SelectItem value="no_debt">Без долга</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">А-Я</SelectItem>
            <SelectItem value="debt_desc">Долг ↓</SelectItem>
            <SelectItem value="debt_asc">Долг ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compact list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
        {paginatedCustomers.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Клиенты не найдены</div>
        ) : paginatedCustomers.map((customer, idx) => (
          <div key={customer.id} onClick={() => setSelectedCustomer(customer)}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 active:bg-slate-100">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-indigo-600">{customer.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
              <p className="text-xs text-slate-400 truncate">{customer.phone}</p>
            </div>
            <div className="text-right flex-shrink-0">
              {can('view_customer_debt') ? (
                (customer.total_debt||0) > 0 ? (
                  <p className="text-sm font-bold text-orange-600">{(customer.total_debt||0).toLocaleString()} с.</p>
                ) : (
                  <p className="text-xs text-emerald-500 font-medium">✓ нет долга</p>
                )
              ) : (
                <p className="text-xs text-slate-300">•••</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          </div>
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 py-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-xs text-slate-400 px-2">{page}/{totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Редактировать клиента' : 'Добавить клиента'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Имя клиента *</Label><Input value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Иван Иванов" className="mt-1.5" /></div>
            <div><Label>Телефон *</Label><Input value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} placeholder="+992..." className="mt-1.5" /></div>
            {!formData.use_phone_for_all && (
              <>
                <div><Label>WhatsApp</Label><Input value={formData.whatsapp} onChange={e=>setFormData({...formData,whatsapp:e.target.value})} className="mt-1.5" /></div>
                <div><Label>Telegram</Label><Input value={formData.telegram} onChange={e=>setFormData({...formData,telegram:e.target.value})} className="mt-1.5" /></div>
              </>
            )}
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} className="mt-1.5" /></div>
            <div><Label>Адрес</Label><Input value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})} className="mt-1.5" /></div>
            <div><Label>Лимит долга (сомони)</Label><Input type="text" inputMode="decimal" value={formData.debt_limit} onChange={e=>setFormData({...formData,debt_limit:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Не ограничен" className="mt-1.5" /></div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving||!formData.name||!formData.phone} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCustomer ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      </PullToRefresh>
      );
      }