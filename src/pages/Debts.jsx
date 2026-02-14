import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CreditCard, 
  DollarSign,
  User,
  Package,
  Calendar,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Debts() {
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [paymentAmount, setPaymentAmount] = useState('');

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
        
        const [salesData, productsData, customersData, paymentsData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id, is_debt: true }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.DebtPayment.filter({ business_id: biz.id })
        ]);
        
        setSales(salesData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setProducts(productsData);
        setCustomers(customersData);
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Расчёт оплаченной суммы для каждой продажи
  const getSalePaidAmount = (saleId) => {
    return payments
      .filter(p => p.sale_id === saleId)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const handleOpenPayment = (sale) => {
    setSelectedSale(sale);
    const paid = getSalePaidAmount(sale.id);
    const remaining = (sale.total_amount || 0) - paid;
    setPaymentAmount(remaining.toString());
    setDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedSale || !paymentAmount) return;
    
    setSaving(true);
    try {
      const amount = parseFloat(paymentAmount);
      const customer = customers.find(c => c.id === selectedSale.customer_id);
      
      // Создаём запись об оплате
      await base44.entities.DebtPayment.create({
        business_id: business.id,
        customer_id: selectedSale.customer_id,
        sale_id: selectedSale.id,
        amount: amount,
        payment_date: new Date().toISOString()
      });

      // Обновляем данные клиента
      if (customer) {
        await base44.entities.Customer.update(customer.id, {
          total_debt: Math.max(0, (customer.total_debt || 0) - amount),
          total_paid: (customer.total_paid || 0) + amount
        });
      }

      await loadData();
      setDialogOpen(false);
      setSelectedSale(null);
      setPaymentAmount('');
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setSaving(false);
    }
  };

  // Фильтрация
  const filteredSales = sales.filter(sale => {
    const customer = customers.find(c => c.id === sale.customer_id);
    const product = products.find(p => p.id === sale.product_id);
    const matchesSearch = 
      customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      product?.brand?.toLowerCase().includes(search.toLowerCase());
    const matchesCustomer = filterCustomer === 'all' || sale.customer_id === filterCustomer;
    return matchesSearch && matchesCustomer;
  });

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
        title="Долги"
        subtitle="Управление долгами клиентов"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-slate-500">Общий долг</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{totalDebt.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-500">Всего оплачено</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-slate-500">Продаж в долг</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Поиск по клиенту или товару..."
            className="w-full sm:w-64"
          />
          <Select value={filterCustomer} onValueChange={setFilterCustomer}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Клиент" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все клиенты</SelectItem>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Товар</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Коробок</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Сумма</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Оплачено</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Остаток</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map(sale => {
                const customer = customers.find(c => c.id === sale.customer_id);
                const product = products.find(p => p.id === sale.product_id);
                const paidAmount = getSalePaidAmount(sale.id);
                const remaining = (sale.total_amount || 0) - paidAmount;
                const isPaid = remaining <= 0;
                
                return (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy', { locale: ru })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-600">
                            {customer?.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{customer?.name || 'Неизвестный'}</p>
                          <p className="text-xs text-slate-500">{customer?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {product?.photo_url ? (
                          <img src={product.photo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <span className="text-sm text-slate-900">{product?.brand} {product?.model}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-900">
                      {sale.boxes_sold}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {sale.total_amount?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {paidAmount.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {remaining.toLocaleString()} с.
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isPaid ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                          Оплачено
                        </span>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleOpenPayment(sale)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Оплата
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Нет продаж в долг</p>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Принять оплату</DialogTitle>
          </DialogHeader>

          {selectedSale && (() => {
            const customer = customers.find(c => c.id === selectedSale.customer_id);
            const product = products.find(p => p.id === selectedSale.product_id);
            const paidAmount = getSalePaidAmount(selectedSale.id);
            const remaining = (selectedSale.total_amount || 0) - paidAmount;

            return (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <p className="text-sm text-slate-500">Клиент: <span className="font-medium text-slate-900">{customer?.name}</span></p>
                  <p className="text-sm text-slate-500">Товар: <span className="font-medium text-slate-900">{product?.brand} {product?.model}</span></p>
                  <p className="text-sm text-slate-500">Сумма долга: <span className="font-medium text-slate-900">{selectedSale.total_amount?.toLocaleString()} с.</span></p>
                  <p className="text-sm text-slate-500">Уже оплачено: <span className="font-medium text-emerald-600">{paidAmount.toLocaleString()} с.</span></p>
                  <p className="text-sm text-slate-500">Остаток: <span className="font-bold text-orange-600">{remaining.toLocaleString()} с.</span></p>
                </div>

                <div>
                  <Label>Сумма оплаты *</Label>
                  <Input 
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Введите сумму"
                    max={remaining}
                    className="mt-1.5"
                  />
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={saving || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Принять оплату'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}