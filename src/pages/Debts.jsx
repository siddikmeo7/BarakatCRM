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
  CreditCard, DollarSign, User, Package, Clock, MessageCircle, Send,
  Phone, MapPin, Loader2, History, ChevronRight, PlusCircle, Plus,
  CheckCircle, ArrowLeft, X
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
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState('ru');

  // Детальный вид клиента
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Оплата конкретной продажи
  const [payDialog, setPayDialog] = useState(null); // { sale }
  const [payAmount, setPayAmount] = useState('');
  const [messageChannel, setMessageChannel] = useState('telegram');
  const [saving, setSaving] = useState(false);

  // Добавить долг вручную
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [addDebtData, setAddDebtData] = useState({
    customer_id: '', new_customer_name: '', new_customer_phone: '',
    amount: '', note: '', is_new_customer: false
  });

  const [sendingMsg, setSendingMsg] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      let biz = null;
      const savedMode = sessionStorage.getItem('barakatcrm_mode');
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

        // Обновляем выбранного клиента если он открыт
        if (selectedCustomer) {
          const updated = customersData.find(c => c.id === selectedCustomer.id);
          if (updated) setSelectedCustomer(updated);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSalePaidAmount = (saleId) => {
    const sale = sales.find(s => s.id === saleId);
    const salePayments = payments.filter(p => p.sale_id === saleId && (p.amount || 0) > 0);
    const fromPayments = salePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const hasPartialRecord = salePayments.some(p => p.note === 'Частичная оплата при продаже');
    const partialFromSale = (!hasPartialRecord && sale?.partial_payment > 0) ? (sale.partial_payment || 0) : 0;
    return fromPayments + partialFromSale;
  };

  const openPayDialog = (sale) => {
    const paid = getSalePaidAmount(sale.id);
    const remaining = (sale.total_amount || 0) - paid;
    setPayAmount(remaining.toString());
    setPayDialog({ sale });
  };

  const handlePayment = async () => {
    if (!payDialog || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    const { sale } = payDialog;
    const paidSoFar = getSalePaidAmount(sale.id);
    const saleRemaining = (sale.total_amount || 0) - paidSoFar;
    const actualAmount = Math.min(amount, saleRemaining);

    setSaving(true);
    try {
      const customer = customers.find(c => c.id === sale.customer_id);
      const product = products.find(p => p.id === sale.product_id);
      const newDebt = customer ? Math.max(0, (customer.total_debt || 0) - actualAmount) : 0;

      const tasks = [
        base44.entities.DebtPayment.create({
          business_id: business.id,
          customer_id: sale.customer_id,
          sale_id: sale.id,
          amount: actualAmount,
          payment_date: new Date().toISOString()
        })
      ];
      if (customer) {
        tasks.push(base44.entities.Customer.update(customer.id, {
          total_debt: newDebt,
          total_paid: (customer.total_paid || 0) + actualAmount
        }));
      }

      const [newPayment] = await Promise.all(tasks);
      if (newPayment) setPayments(prev => [...prev, newPayment]);
      if (customer) {
        const updatedCustomer = { ...customer, total_debt: newDebt, total_paid: (customer.total_paid || 0) + actualAmount };
        setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        if (selectedCustomer?.id === customer.id) setSelectedCustomer(updatedCustomer);
      }

      // Уведомления
      if (customer) {
        if (messageChannel === 'telegram' && customer.telegram) {
          try {
            await base44.functions.invoke('sendTelegramMessage', {
              telegram_id: customer.telegram, customer_name: customer.name,
              product_name: product ? `${product.brand} ${product.model}` : undefined,
              paid_amount: actualAmount, remaining_debt: newDebt, business_name: business?.name, type: 'payment'
            });
          } catch (err) {}
        } else if (messageChannel === 'whatsapp' && customer.phone) {
          let msg = `👋 Здравствуйте, ${customer.name}!\n\n✅ Спасибо за оплату!\n\n💼 ${business?.name}\n`;
          if (product) msg += `📦 ${product.brand} ${product.model}\n`;
          msg += `💰 Оплачено: ${actualAmount.toLocaleString()} сомони\n`;
          msg += newDebt > 0 ? `⏳ Остаток долга: ${newDebt.toLocaleString()} сомони\n` : `🎉 Долг полностью погашен!\n`;
          const waUrl = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
          window.open(waUrl, '_blank');
        }
      }

      setPayDialog(null);
      setPayAmount('');
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = async (customer) => {
    if (!customer?.phone) return alert(t(lang, 'debts_no_phone'));
    setSendingMsg(customer.id);
    try {
      const res = await base44.functions.invoke('sendWhatsAppDebtMessage', {
        phone: customer.phone, customer_name: customer.name,
        remaining_debt: customer.total_debt, business_name: business?.name, type: 'reminder'
      });
      if (res.data?.wa_url) window.open(res.data.wa_url, '_blank');
    } finally { setSendingMsg(null); }
  };

  const handleAddDebt = async () => {
    if (!addDebtData.amount || parseFloat(addDebtData.amount) <= 0) return;
    setSaving(true);
    try {
      let customerId = addDebtData.customer_id;
      let customerName = '';
      if (addDebtData.is_new_customer) {
        const newCust = await base44.entities.Customer.create({
          business_id: business.id, name: addDebtData.new_customer_name,
          phone: addDebtData.new_customer_phone || '', total_debt: parseFloat(addDebtData.amount),
          total_paid: 0, use_phone_for_all: true
        });
        customerId = newCust.id;
        customerName = newCust.name;
      } else {
        const cust = customers.find(c => c.id === customerId);
        customerName = cust?.name || '';
        await base44.entities.Customer.update(customerId, {
          total_debt: (cust?.total_debt || 0) + parseFloat(addDebtData.amount)
        });
      }
      await base44.entities.Sale.create({
        business_id: business.id, product_id: 'manual', customer_id: customerId,
        boxes_sold: 0, total_amount: parseFloat(addDebtData.amount), profit: 0,
        sale_date: new Date().toISOString(), is_debt: true, customer_name: customerName,
        edit_history: [], edit_count: 0
      });
      await loadData();
      setAddDebtOpen(false);
      setAddDebtData({ customer_id: '', new_customer_name: '', new_customer_phone: '', amount: '', note: '', is_new_customer: false });
    } finally { setSaving(false); }
  };

  // Группируем продажи по клиентам
  const customerDebtMap = {};
  sales.forEach(sale => {
    if (!customerDebtMap[sale.customer_id]) {
      customerDebtMap[sale.customer_id] = { sales: [], totalAmount: 0, totalPaid: 0 };
    }
    const paid = getSalePaidAmount(sale.id);
    customerDebtMap[sale.customer_id].sales.push(sale);
    customerDebtMap[sale.customer_id].totalAmount += sale.total_amount || 0;
    customerDebtMap[sale.customer_id].totalPaid += paid;
  });

  // Список клиентов с долгами (с поиском)
  const debtorList = customers
    .filter(c => customerDebtMap[c.id])
    .filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    .map(c => {
      const dm = customerDebtMap[c.id];
      const remaining = dm.totalAmount - dm.totalPaid;
      return { customer: c, ...dm, remaining };
    })
    .sort((a, b) => b.remaining - a.remaining);

  const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const totalDebtors = debtorList.filter(d => d.remaining > 0).length;

  // Продажи выбранного клиента
  const customerSales = selectedCustomer ? (customerDebtMap[selectedCustomer.id]?.sales || []) : [];
  const customerPayments = selectedCustomer ? payments.filter(p => p.customer_id === selectedCustomer.id && p.amount > 0) : [];

  // Таймлайн: продажи + оплаты
  const timeline = [
    ...customerSales.map(s => ({ type: 'sale', date: new Date(s.sale_date || s.created_date), data: s })),
    ...customerPayments.map(p => ({ type: 'payment', date: new Date(p.payment_date || p.created_date), data: p }))
  ].sort((a, b) => b.date - a.date);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // === ДЕТАЛЬНЫЙ ВИД КЛИЕНТА ===
  if (selectedCustomer) {
    const c = selectedCustomer;
    const dm = customerDebtMap[c.id] || { totalAmount: 0, totalPaid: 0, sales: [] };
    const totalRemaining = dm.totalAmount - dm.totalPaid;

    return (
      <div className="space-y-5">
        {/* Хедер */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{c.name}</h1>
            {c.phone && <p className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
          </div>
          <button onClick={() => openWhatsApp(c)} disabled={sendingMsg === c.id}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 text-sm font-medium">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        </div>

        {/* Сводка */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="text-xs text-orange-500 mb-1">Текущий долг</p>
            <p className="text-xl font-bold text-orange-600">{(c.total_debt || 0).toLocaleString()} с.</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-500 mb-1">Оплачено</p>
            <p className="text-xl font-bold text-emerald-600">{(c.total_paid || 0).toLocaleString()} с.</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-500 mb-1">Покупок в долг</p>
            <p className="text-xl font-bold text-blue-600">{customerSales.length}</p>
          </div>
        </div>

        {/* Покупки клиента */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Покупки в долг</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {customerSales.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Нет покупок</p>
            ) : customerSales.map(sale => {
              const prod = products.find(p => p.id === sale.product_id);
              const paid = getSalePaidAmount(sale.id);
              const remaining = (sale.total_amount || 0) - paid;
              const isPaid = remaining <= 0;
              return (
                <div key={sale.id} className="p-4 flex items-center gap-3">
                  {/* Фото / иконка */}
                  {prod?.photo_url ? (
                    <img src={prod.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">
                      {prod ? `${prod.brand} ${prod.model}` : 'Товар не указан'}
                      {sale.boxes_sold > 0 && <span className="text-slate-400 ml-1">· {sale.boxes_sold} кор.</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy', { locale: ru })}
                    </p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-slate-500">Итого: <span className="font-medium text-slate-800">{sale.total_amount?.toLocaleString()} с.</span></span>
                      <span className="text-xs text-emerald-600">Оплачено: <span className="font-medium">{paid.toLocaleString()} с.</span></span>
                      <span className={`text-xs font-bold ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {isPaid ? '✅ Погашено' : `Остаток: ${remaining.toLocaleString()} с.`}
                      </span>
                    </div>
                  </div>
                  {!isPaid && (
                    <Button size="sm" onClick={() => openPayDialog(sale)} className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
                      <DollarSign className="w-3 h-3 mr-1" /> Оплатить
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* История транзакций */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" /> История операций
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Нет операций</p>
            ) : timeline.map((item, i) => {
              if (item.type === 'sale') {
                const s = item.data;
                const prod = products.find(p => p.id === s.product_id);
                return (
                  <div key={`s-${s.id}-${i}`} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        Покупка в долг — <span className="text-orange-600">{s.total_amount?.toLocaleString()} с.</span>
                      </p>
                      <p className="text-xs text-slate-400">{prod ? `${prod.brand} ${prod.model}` : 'Ручной долг'}</p>
                    </div>
                    <p className="text-xs text-slate-400 flex-shrink-0">{format(item.date, 'dd MMM, HH:mm', { locale: ru })}</p>
                  </div>
                );
              } else {
                const p = item.data;
                const relatedSale = sales.find(s => s.id === p.sale_id);
                const prod = relatedSale ? products.find(pr => pr.id === relatedSale.product_id) : null;
                return (
                  <div key={`p-${p.id}-${i}`} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        Оплата — <span className="text-emerald-600">{p.amount?.toLocaleString()} с.</span>
                      </p>
                      {prod && <p className="text-xs text-slate-400">{prod.brand} {prod.model}</p>}
                      {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
                    </div>
                    <p className="text-xs text-slate-400 flex-shrink-0">{format(item.date, 'dd MMM, HH:mm', { locale: ru })}</p>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Pay Dialog */}
        <Dialog open={!!payDialog} onOpenChange={(o) => { if (!o) { setPayDialog(null); setPayAmount(''); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Принять оплату</DialogTitle>
            </DialogHeader>
            {payDialog && (() => {
              const { sale } = payDialog;
              const prod = products.find(p => p.id === sale.product_id);
              const paid = getSalePaidAmount(sale.id);
              const remaining = (sale.total_amount || 0) - paid;
              return (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-slate-50 rounded-xl text-sm space-y-1">
                    {prod && <p className="text-slate-500">Товар: <span className="font-medium text-slate-900">{prod.brand} {prod.model}</span></p>}
                    <p className="text-slate-500">Сумма: <span className="font-medium text-slate-900">{sale.total_amount?.toLocaleString()} с.</span></p>
                    <p className="text-slate-500">Оплачено: <span className="font-medium text-emerald-600">{paid.toLocaleString()} с.</span></p>
                    <p className="text-slate-500">Остаток: <span className="font-bold text-orange-600">{remaining.toLocaleString()} с.</span></p>
                  </div>
                  <div>
                    <Label>Сумма оплаты *</Label>
                    <Input type="text" inputMode="decimal" pattern="[0-9.]*" className="mt-1.5"
                      value={payAmount} onChange={e => setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="Введите сумму..." />
                  </div>
                  <div>
                    <Label>Уведомление</Label>
                    <Select value={messageChannel} onValueChange={setMessageChannel}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telegram">📱 Telegram</SelectItem>
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                        <SelectItem value="none">Без уведомления</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => { setPayDialog(null); setPayAmount(''); }}>Отмена</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={saving || !payAmount || parseFloat(payAmount) <= 0}
                      onClick={handlePayment}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Принять оплату'}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === СПИСОК КЛИЕНТОВ ===
  return (
    <div className="space-y-6">
      <PageHeader
        title={t(lang, 'debts_title')}
        subtitle={t(lang, 'debts_subtitle')}
        actions={
          <Button onClick={() => setAddDebtOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <PlusCircle className="w-4 h-4" /> Добавить долг
          </Button>
        }
      />

      {/* Статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-slate-500">{t(lang, 'debts_total')}</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{totalDebt.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-slate-500">{t(lang, 'debts_debtors')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalDebtors}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-500">Погашенных</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {debtorList.filter(d => d.remaining <= 0).length}
          </p>
        </div>
      </div>

      {/* Поиск */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <SearchInput value={search} onChange={setSearch} placeholder={t(lang, 'debts_search')} />
      </div>

      {/* Список клиентов */}
      <div className="space-y-3">
        {debtorList.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>{t(lang, 'debts_not_found')}</p>
          </div>
        ) : debtorList.map(({ customer: c, sales: cSales, totalAmount, totalPaid, remaining }) => {
          const isPaid = remaining <= 0;
          const unpaidSalesCount = cSales.filter(s => {
            const paid = getSalePaidAmount(s.id);
            return (s.total_amount || 0) - paid > 0;
          }).length;

          return (
            <div key={c.id}
              onClick={() => setSelectedCustomer(c)}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-4">
                {/* Аватар */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                  <span className={`text-lg font-bold ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {c.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    {isPaid && (
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Погашено</span>
                    )}
                  </div>
                  {c.phone && <p className="text-sm text-slate-400">{c.phone}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">{cSales.length} покупок</span>
                    {unpaidSalesCount > 0 && (
                      <span className="text-xs text-orange-500 font-medium">{unpaidSalesCount} не оплачено</span>
                    )}
                  </div>
                </div>

                {/* Долг */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-bold ${isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {remaining.toLocaleString()} с.
                  </p>
                  <p className="text-xs text-slate-400">из {totalAmount.toLocaleString()} с.</p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </div>

              {/* Прогресс-бар */}
              {totalAmount > 0 && (
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isPaid ? 'bg-emerald-500' : 'bg-orange-400'}`}
                    style={{ width: `${Math.min(100, (totalPaid / totalAmount) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Debt Dialog */}
      <Dialog open={addDebtOpen} onOpenChange={setAddDebtOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить долг вручную</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <button onClick={() => setAddDebtData(d => ({ ...d, is_new_customer: false, customer_id: '' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!addDebtData.is_new_customer ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                Существующий клиент
              </button>
              <button onClick={() => setAddDebtData(d => ({ ...d, is_new_customer: true, customer_id: '' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${addDebtData.is_new_customer ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
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
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Выберите клиента..." /></SelectTrigger>
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
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddDebtOpen(false)}>Отмена</Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={saving || !addDebtData.amount || parseFloat(addDebtData.amount) <= 0 || (!addDebtData.is_new_customer && !addDebtData.customer_id) || (addDebtData.is_new_customer && !addDebtData.new_customer_name)}
                onClick={handleAddDebt}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Добавить долг</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}