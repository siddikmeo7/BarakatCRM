import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, User, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CustomerSearchSelect({ 
  customers, 
  value, 
  onChange, 
  businessId,
  onCustomerAdded 
}) {
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const selectedCustomer = customers.find(c => c.id === value);
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    
    setSaving(true);
    try {
      const created = await base44.entities.Customer.create({
        ...newCustomer,
        business_id: businessId,
        total_debt: 0,
        total_paid: 0
      });
      
      if (onCustomerAdded) await onCustomerAdded();
      onChange(created.id);
      setShowAddDialog(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
    } catch (error) {
      console.error('Error adding customer:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Label>Клиент *</Label>
      <div className="relative mt-1.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange('');
          }}
          placeholder="Поиск клиента по имени или телефону..."
          className="pl-10"
        />
      </div>

      {(search || !value) && (
        <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => {
                onChange(customer.id);
                setSearch('');
              }}
              className={`p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 ${value === customer.id ? 'bg-indigo-50' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-600">
                  {customer.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{customer.name}</p>
                <p className="text-sm text-slate-500">{customer.phone}</p>
              </div>
            </div>
          ))}
          
          {filteredCustomers.length === 0 && search && (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-500 mb-3">Клиент не найден</p>
              <Button
                size="sm"
                onClick={() => {
                  setNewCustomer({ ...newCustomer, name: search });
                  setShowAddDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить нового клиента
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить нового клиента</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Имя *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Телефон *</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="+992 XXX XX XX XX"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Адрес</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleAddCustomer}
              disabled={saving || !newCustomer.name || !newCustomer.phone}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}