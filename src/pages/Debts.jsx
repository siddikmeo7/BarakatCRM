import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ViewToggle from '@/components/ui/ViewToggle';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  CreditCard, 
  DollarSign,
  User,
  Package,
  Calendar,
  CheckCircle,
  Loader2,
  History,
  Clock,
  MessageCircle,
  Send,
  Phone,
  MapPin,
  Mail,
  ExternalLink,
  X
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
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, unpaid
  const [filterAmount, setFilterAmount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [view, setView] = useState('list');
  const [sendingMsg, setSendingMsg] = useState(null);

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
        const newDebt = Math.max(0, (customer.total_debt || 0) - amount);
        await base44.entities.Customer.update(customer.id, {
          total_debt: newDebt,
          total_paid: (customer.total_paid || 0) + amount
        });
        // Отправить WhatsApp сообщение при погашении
        if (customer.phone) {
          const waRes = await base44.functions.invoke('sendWhatsAppDebtMessage', {
            phone: customer.phone,
            customer_name: customer.name,
            remaining_debt: newDebt,
            business_name: business?.name,
            type: 'payment'
          });
          if (waRes.data?.wa_url) window.open(waRes.data.wa_url, '_blank');
        }
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

  const openWhatsApp = async (customer, remainingDebt, type = 'reminder') => {
    if (!customer?.phone) return alert('У клиента нет номера телефона');
    setSendingMsg(customer.id);
    try {
      const res = await base44.functions.invoke('sendWhatsAppDebtMessage', {
        phone: customer.phone,
        customer_name: customer.name,
        remaining_debt: remainingDebt,
        business_name: business?.name,
        type
      });
      if (res.data?.wa_url) window.open(res.data.wa_url, '_blank');
    } finally {
      setSendingMsg(null);
    }
  };

  const sendToAllDebtors = async () => {
    const debtors = customers.filter(c => (c.total_debt || 0) > 0);
    for (const c of debtors) {
      const res = await base44.functions.invoke('sendWhatsAppDebtMessage', {
        phone: c.phone,
        customer_name: c.name,
        remaining_debt: c.total_debt,
        business_name: business?.name,
        type: 'reminder'
      });
      if (res.data?.wa_url) window.open(res.data.wa_url, '_blank');
      await new Promise(r => setTimeout(r, 400));
    }
  };

  // Фильтрация
  const filteredSales = sales.filter(sale => {
    const customer = customers.find(c => c.id === sale.customer_id);
    const product = products.find(p => p.id === sale.product_id);
    const paidAmount = getSalePaidAmount(sale.id);
    const remaining = (sale.total_amount || 0) - paidAmount;
    const isPaid = remaining <= 0;
    
    const matchesSearch = 
      customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      product?.brand?.toLowerCase().includes(search.toLowerCase());
    const matchesCustomer = filterCustomer === 'all' || sale.customer_id === filterCustomer;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'paid' && isPaid) || 
      (filterStatus === 'unpaid' && !isPaid);
    const matchesAmount = !filterAmount || remaining >= parseFloat(filterAmount);
    
    return matchesSearch && matchesCustomer && matchesStatus && matchesAmount;
  });

  // Итоги
  const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const fullyPaidCount = customers.filter(c => (c.total_debt || 0) === 0 && (c.total_paid || 0) > 0).length;

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
        actions={
          <Button onClick={sendToAllDebtors} variant="outline" className="gap-2 text-green-700 border-green-300 hover:bg-green-50">
            <MessageCircle className="w-4 h-4" />
            Отправить всем должникам
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-500">Погашено</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fullyPaidCount} клиентов</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          <ViewToggle view={view} onChange={setView} />
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
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="unpaid">Активные</SelectItem>
              <SelectItem value="paid">Погашенные</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1">
            <Input
              type="text"
              pattern="[0-9.]*"
              inputMode="decimal"
              placeholder="Фильтр по сумме долга..."
              value={filterAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setFilterAmount(val);
              }}
              className="max-w-xs"
            />
          </div>
        </div>
      </div>

      {/* Debts Table / Cards */}
      {view === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Дата</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Клиент</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Товар</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Кор.</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Сумма</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Оплачено</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Остаток</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">WA</th>
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
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy', { locale: ru })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-indigo-600">{customer?.name?.charAt(0)?.toUpperCase()}</span>
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
                      <td className="px-4 py-3 text-center font-medium text-slate-900">{sale.boxes_sold}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{sale.total_amount?.toLocaleString()} с.</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">{paidAmount.toLocaleString()} с.</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>{remaining.toLocaleString()} с.</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isPaid && customer && (
                          <button
                            onClick={() => openWhatsApp(customer, remaining, 'reminder')}
                            disabled={sendingMsg === customer.id}
                            className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-700"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm"
                            onClick={() => { setSelectedCustomerHistory({ customerId: customer?.id, customerName: customer?.name }); setHistoryOpen(true); }}>
                            <History className="w-4 h-4" />
                          </Button>
                          {isPaid ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">Оплачено</span>
                          ) : (
                            <Button size="sm" onClick={() => handleOpenPayment(sale)} className="bg-indigo-600 hover:bg-indigo-700">
                              <DollarSign className="w-3 h-3 mr-1" />Оплата
                            </Button>
                          )}
                        </div>
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
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSales.map(sale => {
            const customer = customers.find(c => c.id === sale.customer_id);
            const product = products.find(p => p.id === sale.product_id);
            const paidAmount = getSalePaidAmount(sale.id);
            const remaining = (sale.total_amount || 0) - paidAmount;
            const isPaid = remaining <= 0;
            return (
              <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-600">{customer?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{customer?.name || 'Неизвестный'}</p>
                      <p className="text-xs text-slate-500">{customer?.phone}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isPaid ? 'Оплачено' : 'Активный'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {product?.photo_url ? (
                    <img src={product.photo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                  <span>{product?.brand} {product?.model} · {sale.boxes_sold} кор.</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Сумма</p>
                    <p className="font-semibold text-slate-900 text-sm">{sale.total_amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Оплачено</p>
                    <p className="font-semibold text-emerald-600 text-sm">{paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Остаток</p>
                    <p className={`font-bold text-sm ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>{remaining.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  {!isPaid && customer && (
                    <button onClick={() => openWhatsApp(customer, remaining, 'reminder')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 text-xs font-medium">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomerHistory({ customerId: customer?.id, customerName: customer?.name }); setHistoryOpen(true); }}>
                    <History className="w-4 h-4" />
                  </Button>
                  {!isPaid && (
                    <Button size="sm" onClick={() => handleOpenPayment(sale)} className="bg-indigo-600 hover:bg-indigo-700 flex-1">
                      <DollarSign className="w-3 h-3 mr-1" />Оплата
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredSales.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Нет продаж в долг</p>
            </div>
          )}
        </div>
      )}

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
                    type="text"
                    pattern="[0-9.]*"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setPaymentAmount(val);
                    }}
                    placeholder="Введите сумму"
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

      {/* Payment History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>История платежей - {selectedCustomerHistory?.customerName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {selectedCustomerHistory && payments
              .filter(p => p.customer_id === selectedCustomerHistory.customerId)
              .sort((a, b) => new Date(b.payment_date || b.created_date) - new Date(a.payment_date || a.created_date))
              .map(payment => (
                <div key={payment.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      Оплачено: {payment.amount?.toLocaleString()} сомони
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(payment.payment_date || payment.created_date), 'dd MMM yyyy, HH:mm:ss', { locale: ru })}
                      </span>
                    </div>
                    {payment.note && (
                      <p className="text-sm text-slate-600 mt-1">{payment.note}</p>
                    )}
                  </div>
                </div>
              ))}
            {selectedCustomerHistory && payments.filter(p => p.customer_id === selectedCustomerHistory.customerId).length === 0 && (
              <p className="text-center text-slate-500 py-8">История платежей пуста</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}