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
  X,
  Plus,
  PlusCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { t } from '@/components/i18n/translations';

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
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [lang, setLang] = useState('ru');
  const [messageChannel, setMessageChannel] = useState('telegram');
  // Добавление долга вручную
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [addDebtData, setAddDebtData] = useState({
    customer_id: '',
    new_customer_name: '',
    new_customer_phone: '',
    amount: '',
    note: '',
    is_new_customer: false
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
        setLang(biz.language || 'ru');
        
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
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    
    setSaving(true);
    try {
      const customer = customers.find(c => c.id === selectedSale.customer_id);
      const product = customer ? products.find(p => p.id === selectedSale.product_id) : null;
      const newDebt = customer ? Math.max(0, (customer.total_debt || 0) - amount) : 0;
      
      // Создаём запись об оплате + обновляем клиента параллельно
      const tasks = [
        base44.entities.DebtPayment.create({
          business_id: business.id,
          customer_id: selectedSale.customer_id,
          sale_id: selectedSale.id,
          amount: amount,
          payment_date: new Date().toISOString()
        })
      ];

      if (customer) {
        tasks.push(
          base44.entities.Customer.update(customer.id, {
            total_debt: newDebt,
            total_paid: (customer.total_paid || 0) + amount
          })
        );
      }

      const [newPayment] = await Promise.all(tasks);

      // Обновляем локальный state сразу (без полной перезагрузки)
      setPayments(prev => [...prev, newPayment]);
      if (customer) {
        setCustomers(prev => prev.map(c => c.id === customer.id
          ? { ...c, total_debt: newDebt, total_paid: (c.total_paid || 0) + amount }
          : c
        ));
        // обновляем также selectedCustomerDetail если он открыт
        setSelectedCustomerDetail(prev => prev?.id === customer.id
          ? { ...prev, total_debt: newDebt, total_paid: (prev.total_paid || 0) + amount }
          : prev
        );
      }

      // Отправить сообщение в выбранный канал
      if (customer) {
        if (messageChannel === 'telegram' && customer.telegram) {
          try {
            await base44.functions.invoke('sendTelegramMessage', {
              telegram_id: customer.telegram,
              customer_name: customer.name,
              product_name: product ? `${product.brand} ${product.model}` : undefined,
              paid_amount: amount,
              remaining_debt: newDebt,
              business_name: business?.name,
              type: 'payment'
            });
          } catch (err) {
            console.error('Failed to send Telegram message:', err);
          }
        } else if (messageChannel === 'whatsapp') {
          const phone = customer.phone;
          if (phone) {
            // Строим сообщение прямо здесь, чтобы не зависеть от async
            let msg = `👋 Здравствуйте, ${customer.name}!\n\n`;
            msg += `✅ Спасибо за оплату!\n\n`;
            msg += `💼 Бизнес: ${business?.name || 'Наша компания'}\n`;
            if (product) msg += `📦 Товар: ${product.brand} ${product.model}\n`;
            msg += `💰 Оплачено: ${amount.toLocaleString('ru-RU')} сомони\n`;
            if (newDebt > 0) {
              msg += `⏳ Остаток долга: ${newDebt.toLocaleString('ru-RU')} сомони\n`;
            } else {
              msg += `🎉 Долг полностью погашен!\n`;
            }
            msg += `\nСпасибо за доверие!`;

            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
          }
        }
      }

      setDialogOpen(false);
      setSelectedSale(null);
      setPaymentAmount('');
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = async (customer, remainingDebt, type = 'reminder', sale = null) => {
    if (!customer?.phone) return alert(t(lang, 'debts_no_phone'));
    setSendingMsg(customer.id);
    try {
      const product = sale ? products.find(p => p.id === sale.product_id) : null;
      const paidAmount = sale ? getSalePaidAmount(sale.id) : 0;
      const res = await base44.functions.invoke('sendWhatsAppDebtMessage', {
        phone: customer.phone,
        customer_name: customer.name,
        product_name: product ? `${product.brand} ${product.model}` : undefined,
        total_debt: sale ? sale.total_amount : customer.total_debt,
        paid_amount: paidAmount,
        remaining_debt: remainingDebt,
        business_name: business?.name,
        type
      });
      if (res.data?.wa_url) window.open(res.data.wa_url, '_blank');
    } finally {
      setSendingMsg(null);
    }
  };

  const openCustomerDetail = (customer) => {
    setSelectedCustomerDetail(customer);
    setCustomerDetailOpen(true);
  };

  const handleAddDebt = async () => {
    if (!addDebtData.amount || parseFloat(addDebtData.amount) <= 0) return;
    setSaving(true);
    try {
      let customerId = addDebtData.customer_id;
      let customerName = '';

      if (addDebtData.is_new_customer) {
        // Создаём нового клиента
        const newCust = await base44.entities.Customer.create({
          business_id: business.id,
          name: addDebtData.new_customer_name,
          phone: addDebtData.new_customer_phone || '',
          total_debt: parseFloat(addDebtData.amount),
          total_paid: 0,
          use_phone_for_all: true
        });
        customerId = newCust.id;
        customerName = newCust.name;
      } else {
        const cust = customers.find(c => c.id === customerId);
        customerName = cust?.name || '';
        // Обновляем долг существующего клиента
        await base44.entities.Customer.update(customerId, {
          total_debt: (cust?.total_debt || 0) + parseFloat(addDebtData.amount)
        });
      }

      // Создаём продажу-долг без привязки к товару
      await base44.entities.Sale.create({
        business_id: business.id,
        product_id: 'manual',
        customer_id: customerId,
        boxes_sold: 0,
        total_amount: parseFloat(addDebtData.amount),
        profit: 0,
        sale_date: new Date().toISOString(),
        is_debt: true,
        customer_name: customerName,
        edit_history: [],
        edit_count: 0
      });

      // Если есть заметка — создаём запись оплаты с нулём как placeholde note
      if (addDebtData.note) {
        await base44.entities.DebtPayment.create({
          business_id: business.id,
          customer_id: customerId,
          sale_id: 'note',
          amount: 0,
          note: addDebtData.note,
          payment_date: new Date().toISOString()
        });
      }

      await loadData();
      setAddDebtOpen(false);
      setAddDebtData({ customer_id: '', new_customer_name: '', new_customer_phone: '', amount: '', note: '', is_new_customer: false });
    } finally {
      setSaving(false);
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
        title={t(lang, 'debts_title')}
        subtitle={t(lang, 'debts_subtitle')}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setAddDebtOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <PlusCircle className="w-4 h-4" />
              Добавить долг
            </Button>
            <Button onClick={sendToAllDebtors} variant="outline" className="gap-2 text-green-700 border-green-300 hover:bg-green-50">
              <MessageCircle className="w-4 h-4" />
              {t(lang, 'debts_send_all')}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-slate-500">{t(lang, 'debts_total')}</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{totalDebt.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-500">{t(lang, 'cust_total_paid')}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-slate-500">{t(lang, 'debts_debt_sales')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-500">{t(lang, 'debts_paid_off')}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fullyPaidCount} {t(lang, 'debts_clients')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          <ViewToggle view={view} onChange={setView} />
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder={t(lang, 'debts_search')}
            className="w-full sm:w-64"
          />
          <Select value={filterCustomer} onValueChange={setFilterCustomer}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t(lang, 'cust_name')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang, 'debts_all_customers')}</SelectItem>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t(lang, 'debts_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang, 'all')}</SelectItem>
              <SelectItem value="unpaid">{t(lang, 'debts_active')}</SelectItem>
              <SelectItem value="paid">{t(lang, 'debts_paid_off')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1">
            <Input
              type="text"
              pattern="[0-9.]*"
              inputMode="decimal"
              placeholder={t(lang, 'debts_filter_amount')}
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
                  <th className="px-3 py-3 text-center text-sm font-medium text-slate-400 w-8">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t(lang,'sales_date')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t(lang,'cust_name')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t(lang,'sales_product')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">{t(lang,'sales_boxes_short')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">{t(lang,'sales_amount')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">{t(lang,'cust_paid')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">{t(lang,'debts_remaining')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">WA</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">{t(lang,'debts_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale, idx) => {
                  const customer = customers.find(c => c.id === sale.customer_id);
                  const product = products.find(p => p.id === sale.product_id);
                  const paidAmount = getSalePaidAmount(sale.id);
                  const remaining = (sale.total_amount || 0) - paidAmount;
                  const isPaid = remaining <= 0;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-center text-xs font-mono text-slate-400 select-none">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy', { locale: ru })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => customer && openCustomerDetail(customer)} className="flex items-center gap-2 hover:opacity-75 transition-opacity text-left">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-indigo-600">{customer?.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 underline-offset-2 hover:underline">{customer?.name || t(lang,'sales_unknown')}</p>
                            <p className="text-xs text-slate-500">{customer?.phone}</p>
                          </div>
                        </button>
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
                          <span className="text-sm text-slate-900">
                            {product ? `${product.brand} ${product.model}` : <span className="text-slate-400 italic">{t(lang,'sales_unknown')}</span>}
                          </span>
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
                            onClick={() => openWhatsApp(customer, remaining, 'reminder', sale)}
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
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">{t(lang,'debts_paid_off')}</span>
                          ) : (
                            <Button size="sm" onClick={() => handleOpenPayment(sale)} className="bg-indigo-600 hover:bg-indigo-700">
                              <DollarSign className="w-3 h-3 mr-1" />{t(lang,'debts_pay')}
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
              <p>{t(lang,'debts_not_found')}</p>
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
                  <button onClick={() => customer && openCustomerDetail(customer)} className="flex items-center gap-2 hover:opacity-75 transition-opacity text-left">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-600">{customer?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 hover:underline underline-offset-2">{customer?.name || t(lang,'sales_unknown')}</p>
                      <p className="text-xs text-slate-500">{customer?.phone}</p>
                    </div>
                  </button>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isPaid ? t(lang,'debts_paid_off') : t(lang,'debts_active')}
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
                  <span>
                    {product ? `${product.brand} ${product.model}` : <span className="text-slate-400 italic">{t(lang,'sales_unknown')}</span>}
                    {' · '}{sale.boxes_sold} {t(lang,'sales_boxes_short')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div>
                    <p className="text-xs text-slate-400">{t(lang,'sales_amount')}</p>
                    <p className="font-semibold text-slate-900 text-sm">{sale.total_amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{t(lang,'cust_paid')}</p>
                    <p className="font-semibold text-emerald-600 text-sm">{paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{t(lang,'debts_remaining')}</p>
                    <p className={`font-bold text-sm ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>{remaining.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                   {!isPaid && customer && (
                     <button onClick={() => openWhatsApp(customer, remaining, 'reminder', sale)}
                       className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 text-xs font-medium">
                       <MessageCircle className="w-3 h-3" /> WhatsApp
                     </button>
                   )}
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomerHistory({ customerId: customer?.id, customerName: customer?.name }); setHistoryOpen(true); }}>
                    <History className="w-4 h-4" />
                  </Button>
                  {!isPaid && (
                    <Button size="sm" onClick={() => handleOpenPayment(sale)} className="bg-indigo-600 hover:bg-indigo-700 flex-1">
                      <DollarSign className="w-3 h-3 mr-1" />{t(lang,'debts_pay')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredSales.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>{t(lang,'debts_not_found')}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(lang,'debts_pay_title')}</DialogTitle>
          </DialogHeader>

          {selectedSale && (() => {
            const customer = customers.find(c => c.id === selectedSale.customer_id);
            const product = products.find(p => p.id === selectedSale.product_id);
            const paidAmount = getSalePaidAmount(selectedSale.id);
            const remaining = (selectedSale.total_amount || 0) - paidAmount;

            return (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <p className="text-sm text-slate-500">{t(lang,'cust_name')}: <span className="font-medium text-slate-900">{customer?.name}</span></p>
                  <p className="text-sm text-slate-500">{t(lang,'sales_product')}: <span className="font-medium text-slate-900">{product?.brand} {product?.model}</span></p>
                  <p className="text-sm text-slate-500">{t(lang,'debts_total')}: <span className="font-medium text-slate-900">{selectedSale.total_amount?.toLocaleString()} с.</span></p>
                  <p className="text-sm text-slate-500">{t(lang,'cust_paid')}: <span className="font-medium text-emerald-600">{paidAmount.toLocaleString()} с.</span></p>
                  <p className="text-sm text-slate-500">{t(lang,'debts_remaining')}: <span className="font-bold text-orange-600">{remaining.toLocaleString()} с.</span></p>
                </div>

                <div>
                   <Label>{t(lang,'debts_pay_amount')} *</Label>
                   <Input 
                    type="text"
                    pattern="[0-9.]*"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setPaymentAmount(val);
                    }}
                    placeholder={t(lang,'debts_pay_amount')}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Отправить уведомление</Label>
                  <Select value={messageChannel} onValueChange={setMessageChannel}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telegram">📱 Telegram</SelectItem>
                      <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                      <SelectItem value="none">Без уведомления</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setSelectedSale(null); setPaymentAmount(''); setMessageChannel('telegram'); }}>
              {t(lang,'cancel')}
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={saving || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t(lang,'debts_pay_btn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog - Full debt view */}
      <Dialog open={customerDetailOpen} onOpenChange={setCustomerDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t(lang,'debts_customer_info')}</DialogTitle>
          </DialogHeader>
          {selectedCustomerDetail && (() => {
            const c = selectedCustomerDetail;
            const whatsappNum = c.use_phone_for_all ? c.phone : (c.whatsapp || c.phone);
            const telegramNum = c.use_phone_for_all ? c.phone : (c.telegram || c.phone);
            const customerSales = sales.filter(s => s.customer_id === c.id);
            const customerPayments = payments.filter(p => p.customer_id === c.id);
            
            // Build a unified timeline of purchases + payments
            const timeline = [
              ...customerSales.map(s => ({ type: 'sale', date: new Date(s.sale_date || s.created_date), data: s })),
              ...customerPayments.filter(p => p.amount > 0).map(p => ({ type: 'payment', date: new Date(p.payment_date || p.created_date), data: p }))
            ].sort((a, b) => b.date - a.date);

            return (
              <div className="space-y-4 py-2">
                {/* Avatar + Name + Contact */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-indigo-600">{c.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold text-slate-900">{c.name}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {c.phone && <span className="flex items-center gap-1 text-sm text-slate-500"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.address && <span className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="w-3 h-3" />{c.address}</span>}
                    </div>
                  </div>
                </div>

                {/* Debt Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-orange-500 mb-1">Текущий долг</p>
                    <p className="text-lg font-bold text-orange-600">{(c.total_debt || 0).toLocaleString()} с.</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-emerald-500 mb-1">Всего оплачено</p>
                    <p className="text-lg font-bold text-emerald-600">{(c.total_paid || 0).toLocaleString()} с.</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-500 mb-1">Покупок в долг</p>
                    <p className="text-lg font-bold text-blue-600">{customerSales.length}</p>
                  </div>
                </div>

                {/* Messenger Buttons */}
                <div className="flex gap-2">
                  <a href={`https://wa.me/${whatsappNum?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 text-sm font-medium">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <a href={`https://t.me/${telegramNum?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 text-sm font-medium">
                    <Send className="w-4 h-4" /> Telegram
                  </a>
                </div>

                {/* Full Timeline */}
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" />
                    Полная история операций
                  </h4>
                  {timeline.length === 0 ? (
                    <p className="text-center text-slate-400 py-6 text-sm">Нет данных</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {timeline.map((item, i) => {
                        if (item.type === 'sale') {
                          const s = item.data;
                          const prod = products.find(p => p.id === s.product_id);
                          const paid = getSalePaidAmount(s.id);
                          const rem = (s.total_amount || 0) - paid;
                          return (
                            <div key={`s-${s.id}`} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                              <div className="w-8 h-8 rounded-lg bg-orange-200 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-orange-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-orange-800 text-sm">
                                    Покупка в долг — {s.total_amount?.toLocaleString()} с.
                                  </span>
                                  <span className="text-xs text-orange-600 font-medium flex-shrink-0">
                                    {rem > 0 ? `Осталось: ${rem.toLocaleString()} с.` : '✅ Погашено'}
                                  </span>
                                </div>
                                <p className="text-xs text-orange-600 mt-0.5">
                                  {prod ? `${prod.brand} ${prod.model}` : 'Товар не указан'} · {s.boxes_sold} кор.
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(item.date, 'dd MMMM yyyy, HH:mm', { locale: ru })}
                                </p>
                              </div>
                            </div>
                          );
                        } else {
                          const p = item.data;
                          return (
                            <div key={`p-${p.id}`} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                              <div className="w-8 h-8 rounded-lg bg-emerald-200 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="w-4 h-4 text-emerald-700" />
                              </div>
                              <div className="flex-1">
                                <span className="font-semibold text-emerald-800 text-sm">
                                  Оплата — {p.amount?.toLocaleString()} с.
                                </span>
                                {p.note && <p className="text-xs text-emerald-600 mt-0.5">{p.note}</p>}
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(item.date, 'dd MMMM yyyy, HH:mm', { locale: ru })}
                                </p>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>

                <Link to={createPageUrl('Customers')} onClick={() => setCustomerDetailOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
                  <ExternalLink className="w-4 h-4" /> {t(lang,'debts_edit_customer')}
                </Link>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Debt Dialog */}
      <Dialog open={addDebtOpen} onOpenChange={setAddDebtOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить долг вручную</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Новый или существующий клиент */}
            <div className="flex gap-2">
              <button
                onClick={() => setAddDebtData(d => ({ ...d, is_new_customer: false, customer_id: '' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!addDebtData.is_new_customer ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
              >
                Существующий клиент
              </button>
              <button
                onClick={() => setAddDebtData(d => ({ ...d, is_new_customer: true, customer_id: '' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${addDebtData.is_new_customer ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
              >
                Новый клиент
              </button>
            </div>

            {addDebtData.is_new_customer ? (
              <>
                <div>
                  <Label>Имя клиента *</Label>
                  <Input className="mt-1.5" placeholder="Введите имя..." value={addDebtData.new_customer_name}
                    onChange={e => setAddDebtData(d => ({ ...d, new_customer_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input className="mt-1.5" placeholder="+992..." value={addDebtData.new_customer_phone}
                    onChange={e => setAddDebtData(d => ({ ...d, new_customer_phone: e.target.value }))} />
                </div>
              </>
            ) : (
              <div>
                <Label>Выберите клиента *</Label>
                <Select value={addDebtData.customer_id} onValueChange={v => setAddDebtData(d => ({ ...d, customer_id: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Выберите клиента..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.total_debt > 0 ? `(долг: ${c.total_debt.toLocaleString()} с.)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Сумма долга (сомони) *</Label>
              <Input className="mt-1.5" type="text" inputMode="decimal" pattern="[0-9.]*"
                placeholder="0" value={addDebtData.amount}
                onChange={e => setAddDebtData(d => ({ ...d, amount: e.target.value.replace(/[^0-9.]/g, '') }))} />
            </div>

            <div>
              <Label>Примечание (необязательно)</Label>
              <Input className="mt-1.5" placeholder="Причина долга, товар и т.д." value={addDebtData.note}
                onChange={e => setAddDebtData(d => ({ ...d, note: e.target.value }))} />
            </div>

            {addDebtData.amount && parseFloat(addDebtData.amount) > 0 && (
              <div className="p-3 bg-orange-50 rounded-xl text-center">
                <p className="text-sm text-orange-500">Сумма долга</p>
                <p className="text-2xl font-bold text-orange-600">{parseFloat(addDebtData.amount || 0).toLocaleString()} с.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddDebtOpen(false)}>Отмена</Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={saving || !addDebtData.amount || parseFloat(addDebtData.amount) <= 0 || (!addDebtData.is_new_customer && !addDebtData.customer_id) || (addDebtData.is_new_customer && !addDebtData.new_customer_name)}
                onClick={handleAddDebt}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Добавить долг</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t(lang,'debts_history')} - {selectedCustomerHistory?.customerName}</DialogTitle>
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
                      {t(lang,'debts_paid_label')}: {payment.amount?.toLocaleString()} {t(lang,'dash_somoni')}
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
              <p className="text-center text-slate-500 py-8">{t(lang,'debts_no_payments')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}