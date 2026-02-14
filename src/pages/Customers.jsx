import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Users, 
  Edit2, 
  Trash2, 
  Phone,
  Mail,
  CreditCard,
  Loader2
} from 'lucide-react';

export default function Customers() {
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
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
        email: customer.email || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...formData, business_id: business.id };
      
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
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Поиск по имени или телефону..."
          className="max-w-md"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
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
        ))}
      </div>

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
  );
}