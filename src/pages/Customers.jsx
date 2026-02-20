import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ShieldAlert
} from 'lucide-react';

export default function Customers() {
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  
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
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      
      if (businesses.length > 0) {
        const biz = businesses[0];
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
        debt_limit: customer.debt_limit != null ? String(customer.debt_limit) : ''
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
        debt_limit: formData.debt_limit !== '' ? parseFloat(formData.debt_limit) : null
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
    if (confirm('Удалить этого клиента?')) {
      await base44.entities.Customer.delete(customerId);
      await loadData();
    }
  };

  // Фильтрация
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone?.includes(search)
  );

  // Итоги
  const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="space-y-6">
      <PageHeader 
        title="Клиенты"
        subtitle={`${customers.length} клиентов`}
        actions={
          <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Добавить клиента
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Всего клиентов</p>
          <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Общий долг</p>
          <p className="text-2xl font-bold text-orange-600">{totalDebt.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Всего оплачено</p>
          <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString()} с.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Поиск по имени или телефону..."
            className="max-w-md flex-1"
          />
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* Customers Grid/List */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Телефон</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Долг</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Оплачено</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">WhatsApp</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => {
                const whatsappNum = customer.use_phone_for_all ? customer.phone : (customer.whatsapp || customer.phone);
                return (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-600">{customer.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          {customer.address && <p className="text-xs text-slate-400">{customer.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{customer.phone}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-600">{(customer.total_debt || 0).toLocaleString()} с.</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{(customer.total_paid || 0).toLocaleString()} с.</td>
                    <td className="px-4 py-3 text-center">
                      <a href={`https://wa.me/${whatsappNum.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 text-xs">
                        <MessageCircle className="w-3 h-3" /> WA
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleOpenDialog(customer)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </button>
                        <button onClick={() => handleDelete(customer.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {view === 'grid' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const whatsappNum = customer.use_phone_for_all ? customer.phone : (customer.whatsapp || customer.phone);
          const telegramNum = customer.use_phone_for_all ? customer.phone : (customer.telegram || customer.phone);
          
          return (
            <div key={customer.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-indigo-600">
                      {customer.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenDialog(customer)}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button 
                      onClick={() => handleDelete(customer.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">{customer.name}</h3>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {customer.phone}
                  </p>
                  {customer.email && (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {customer.email}
                    </p>
                  )}
                  {customer.address && (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {customer.address}
                    </p>
                  )}
                </div>
                
                {/* Messenger Buttons */}
                <div className="flex gap-2 mb-4">
                  <a
                    href={`https://wa.me/${whatsappNum.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 p-2 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center gap-1 text-green-700 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">WA</span>
                  </a>
                  <a
                    href={`https://t.me/${telegramNum.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1 text-blue-700 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span className="text-xs font-medium">TG</span>
                  </a>
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex-1 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center justify-center gap-1 text-purple-700 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="text-xs font-medium">Email</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-sm text-slate-500">Долг</p>
                    <p className={`text-lg font-bold ${(customer.total_debt || 0) > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {(customer.total_debt || 0).toLocaleString()} с.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Оплачено</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {(customer.total_paid || 0).toLocaleString()} с.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Клиенты не найдены</p>
          <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
            Добавить первого клиента
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Редактировать клиента' : 'Добавить клиента'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label>Имя клиента *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иван Иванов"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Телефон *</Label>
              <Input 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+992 XXX XX XX XX"
                className="mt-1.5"
              />
            </div>
            
            {/* Use phone for all messengers */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="use_phone_for_all"
                  checked={formData.use_phone_for_all}
                  onChange={(e) => setFormData({ ...formData, use_phone_for_all: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="use_phone_for_all" className="text-sm text-slate-700">
                  Использовать основной номер для WhatsApp и Telegram
                </label>
              </div>
            </div>
            
            {!formData.use_phone_for_all && (
              <>
                <div>
                  <Label>WhatsApp</Label>
                  <Input 
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+992 XXX XX XX XX"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Telegram</Label>
                  <Input 
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    placeholder="@username или +992..."
                    className="mt-1.5"
                  />
                </div>
              </>
            )}
            <div>
              <Label>Email (необязательно)</Label>
              <Input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Адрес</Label>
              <Input 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Город, улица, дом"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Лимит долга (сомони)</Label>
              <Input 
                type="number"
                inputMode="decimal"
                value={formData.debt_limit}
                onChange={(e) => setFormData({ ...formData, debt_limit: e.target.value })}
                placeholder="Без лимита"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-400 mt-1">Продажи в долг сверх лимита будут заблокированы</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name || !formData.phone}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCustomer ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      </PullToRefresh>
      );
      }