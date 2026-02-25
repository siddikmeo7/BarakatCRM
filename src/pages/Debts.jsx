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
import { format, parseISO, isToday, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { t } from '@/components/i18n/translations';

// Проверяет, есть ли у клиента продажа с просроченным или сегодняшним сроком оплаты
const getDueDateStatus = (salesList) => {
  const today = startOfDay(new Date());
  let isOverdue = false, isDueToday = false;
  for (const s of salesList) {
    if (!s.payment_due_date || s.is_cancelled) continue;
    const due = startOfDay(new Date(s.payment_due_date));
    if (due < today) isOverdue = true;
    else if (due.getTime() === today.getTime()) isDueToday = true;
  }
  return isOverdue ? 'overdue' : isDueToday ? 'today' : null;
};

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
  const [expandedSaleHistory, setExpandedSaleHistory] = useState({}); // { saleId: true/false }
  const [editingDueDate, setEditingDueDate] = useState({}); // { saleId: 'YYYY-MM-DD' }
  const [savingDueDate, setSavingDueDate] = useState(null);

  // Оплата конкретной продажи
  const [payDialog, setPayDialog] = useState(null); // { sale }
  const [payAmount, setPayAmount] = useState('');
  const [messageChannel, setMessageChannel] = useState('telegram');
  const [saving, setSaving] = useState(false);

  // Частичное погашение всего долга клиента
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [bulkPayAmount, setBulkPayAmount] = useState('');
  const [bulkPaySaving, setBulkPaySaving] = useState(false);

  // Добавить долг вручную
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [addDebtData, setAddDebtData] = useState({
    customer_id: '', new_customer_name: '', new_customer_phone: '',
    amount: '', note: '', is_new_customer: false
  });

  const [sendingMsg, setSendingMsg] = useState(null);
  const [sortDebtors, setSortDebtors] = useState('remaining_desc');

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
    if (amount > saleRemaining) return;
    const actualAmount = amount;

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

  // Частичное погашение всего долга клиента — система сама распределяет по продажам
  const handleBulkPayment = async () => {
    if (!selectedCustomer || !bulkPayAmount) return;
    let remaining = parseFloat(bulkPayAmount);
    if (!remaining || remaining <= 0) return;
    const totalRemainingDebt = customerSales
      .filter(s => !s.is_cancelled)
      .reduce((sum, s) => sum + Math.max(0, (s.total_amount || 0) - getSalePaidAmount(s.id)), 0);
    if (remaining > totalRemainingDebt) return;
    setBulkPaySaving(true);
    try {
      const customer = selectedCustomer;
      // Берём все неоплаченные продажи клиента, сортируем по дате (старые первые)
      const unpaidSales = customerSales
        .filter(s => !s.is_cancelled && (s.total_amount || 0) - getSalePaidAmount(s.id) > 0)
        .sort((a, b) => new Date(a.sale_date || a.created_date) - new Date(b.sale_date || b.created_date));

      const totalPaid = parseFloat(bulkPayAmount); // принимаем всю введённую сумму
      const newPayments = [];
      let toDistribute = totalPaid;
      for (const sale of unpaidSales) {
        if (toDistribute <= 0) break;
        const saleRemaining = (sale.total_amount || 0) - getSalePaidAmount(sale.id);
        const toApply = Math.min(toDistribute, saleRemaining);
        if (toApply > 0) {
          newPayments.push(
            base44.entities.DebtPayment.create({
              business_id: business.id,
              customer_id: customer.id,
              sale_id: sale.id,
              amount: toApply,
              payment_date: new Date().toISOString(),
              note: 'Частичное погашение долга'
            })
          );
          toDistribute -= toApply;
        }
      }
      const created = await Promise.all(newPayments);

      // Обновляем клиента (долг не может быть меньше 0)
      const updatedCustomer = {
        ...customer,
        total_debt: Math.max(0, (customer.total_debt || 0) - totalPaid),
        total_paid: (customer.total_paid || 0) + totalPaid
      };
      await base44.entities.Customer.update(customer.id, {
        total_debt: updatedCustomer.total_debt,
        total_paid: updatedCustomer.total_paid
      });

      setPayments(prev => [...prev, ...created]);
      setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer);

      setBulkPayOpen(false);
      setBulkPayAmount('');
    } finally {
      setBulkPaySaving(false);
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
    .sort((a, b) => {
      if (sortDebtors === 'remaining_asc') return a.remaining - b.remaining;
      if (sortDebtors === 'name_asc') return a.customer.name?.localeCompare(b.customer.name);
      if (sortDebtors === 'purchases_desc') return b.sales.length - a.sales.length;
      return b.remaining - a.remaining; // remaining_desc по умолчанию
    });

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

    const toggleSaleHistory = (saleId) => {
      setExpandedSaleHistory(prev => ({ ...prev, [saleId]: !prev[saleId] }));
    };

    const startEditDueDate = (sale) => {
      setEditingDueDate(prev => ({ ...prev, [sale.id]: sale.payment_due_date || '' }));
    };

    const cancelEditDueDate = (saleId) => {
      setEditingDueDate(prev => { const n = { ...prev }; delete n[saleId]; return n; });
    };

    const saveDueDate = async (saleId) => {
      setSavingDueDate(saleId);
      const newDate = editingDueDate[saleId] || null;
      await base44.entities.Sale.update(saleId, { payment_due_date: newDate });
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, payment_due_date: newDate } : s));
      cancelEditDueDate(saleId);
      setSavingDueDate(null);
    };

    return (
      <div className="space-y-5">
        {/* Хедер */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setExpandedSaleHistory({}); }} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{c.name}</h1>
            {c.phone && <p className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"
              onClick={() => { setAddDebtData({ customer_id: c.id, new_customer_name: '', new_customer_phone: '', amount: '', note: '', is_new_customer: false }); setAddDebtOpen(true); }}
              className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50">
              <Plus className="w-3.5 h-3.5" /> Добавить долг
            </Button>
            {(customerDebtMap[c.id]?.totalAmount - customerDebtMap[c.id]?.totalPaid) > 0 && (
              <Button size="sm" onClick={() => { setBulkPayOpen(true); setBulkPayAmount(''); }}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" /> Погасить долг
              </Button>
            )}
            <button onClick={() => openWhatsApp(c)} disabled={sendingMsg === c.id}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 text-sm font-medium">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>

        {/* Сводка */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Финансовая сводка</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">Всего куплено в долг</p>
              <p className="text-lg font-bold text-slate-800">{dm.totalAmount.toLocaleString()} с.</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-emerald-500 mb-0.5">Оплачено</p>
              <p className="text-lg font-bold text-emerald-600">{dm.totalPaid.toLocaleString()} с.</p>
            </div>
            <div className={`rounded-xl p-3 ${totalRemaining > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
              <p className={`text-xs mb-0.5 ${totalRemaining > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>Остаток долга</p>
              <p className={`text-lg font-bold ${totalRemaining > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {totalRemaining > 0 ? `${totalRemaining.toLocaleString()} с.` : '✅ 0 с.'}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-400 mb-0.5">Покупок в долг</p>
              <p className="text-lg font-bold text-blue-600">{customerSales.length}</p>
            </div>
          </div>
          {/* Общий прогресс-бар */}
          {dm.totalAmount > 0 && (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Прогресс оплаты</span>
                <span>{Math.round((dm.totalPaid / dm.totalAmount) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${totalRemaining <= 0 ? 'bg-emerald-500' : 'bg-orange-400'}`}
                  style={{ width: `${Math.min(100, (dm.totalPaid / dm.totalAmount) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Список покупок с инлайн-историей */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Купленные товары в долг</h3>
            <button
              onClick={() => {
                const allIds = customerSales.map(s => s.id);
                const allOpen = allIds.every(id => expandedSaleHistory[id]);
                const newState = {};
                allIds.forEach(id => { newState[id] = !allOpen; });
                setExpandedSaleHistory(newState);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all"
            >
              <History className="w-3.5 h-3.5" />
              {customerSales.every(s => expandedSaleHistory[s.id]) ? 'Скрыть все транзакции' : 'Показать все транзакции'}
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {customerSales.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Нет покупок</p>
            ) : customerSales.map(sale => {
              const prod = products.find(p => p.id === sale.product_id);
              const paid = getSalePaidAmount(sale.id);
              const remaining = (sale.total_amount || 0) - paid;
              const isPaid = remaining <= 0;
              const progress = sale.total_amount > 0 ? Math.min(100, (paid / sale.total_amount) * 100) : 0;
              const salePayments = payments.filter(p => p.sale_id === sale.id && p.amount > 0)
                .sort((a, b) => new Date(b.payment_date || b.created_date) - new Date(a.payment_date || a.created_date));
              const isHistoryOpen = !!expandedSaleHistory[sale.id];

              return (
                <div key={sale.id} className={`divide-y divide-slate-50 ${isPaid ? 'bg-emerald-50/60' : ''}`}>
                  {/* Карточка товара */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {prod?.photo_url ? (
                        <img src={prod.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 text-sm">
                            {prod ? `${prod.brand} ${prod.model}` : 'Товар не указан'}
                            {sale.boxes_sold > 0 && <span className="text-slate-400 font-normal ml-1">· {sale.boxes_sold} кор.</span>}
                          </p>
                          {isPaid && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Долг погашен
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy', { locale: ru })}
                        </p>
                        {/* Срок оплаты + редактирование */}
                        {editingDueDate[sale.id] !== undefined ? (
                          <div className="mt-1.5 flex items-center gap-2">
                            <Input
                              type="date"
                              value={editingDueDate[sale.id]}
                              onChange={e => setEditingDueDate(prev => ({ ...prev, [sale.id]: e.target.value }))}
                              className="h-7 text-xs px-2 w-36"
                            />
                            <button onClick={() => saveDueDate(sale.id)} disabled={savingDueDate === sale.id}
                              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                              {savingDueDate === sale.id ? '...' : 'Сохранить'}
                            </button>
                            <button onClick={() => cancelEditDueDate(sale.id)} className="text-xs text-slate-400 hover:text-slate-600">Отмена</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-0.5">
                            {sale.payment_due_date && !isPaid ? (
                              <p className={`text-xs font-medium ${
                                startOfDay(new Date(sale.payment_due_date)) < startOfDay(new Date()) ? 'text-red-600' :
                                isToday(new Date(sale.payment_due_date)) ? 'text-amber-600' : 'text-slate-500'
                              }`}>
                                📅 Срок: {format(new Date(sale.payment_due_date), 'dd MMM yyyy', { locale: ru })}
                                {startOfDay(new Date(sale.payment_due_date)) < startOfDay(new Date()) ? ' — просрочено!' :
                                 isToday(new Date(sale.payment_due_date)) ? ' — сегодня!' : ''}
                              </p>
                            ) : !isPaid ? (
                              <p className="text-xs text-slate-300">Срок не указан</p>
                            ) : null}
                            {!isPaid && (
                              <button onClick={() => startEditDueDate(sale)} className="text-xs text-indigo-400 hover:text-indigo-600 underline">
                                {sale.payment_due_date ? 'Изменить' : '+ Указать срок'}
                              </button>
                            )}
                          </div>
                        )}
                        {/* Финансовая сводка */}
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <p className="text-slate-400">Итого</p>
                            <p className="font-bold text-slate-800">{sale.total_amount?.toLocaleString()} с.</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-2 text-center">
                            <p className="text-emerald-500">Оплачено</p>
                            <p className="font-bold text-emerald-700">{paid.toLocaleString()} с.</p>
                          </div>
                          <div className={`rounded-lg p-2 text-center ${isPaid ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                            <p className={isPaid ? 'text-emerald-500' : 'text-orange-500'}>Долг</p>
                            <p className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-orange-700'}`}>
                              {isPaid ? '✅ 0' : `${remaining.toLocaleString()} с.`}
                            </p>
                          </div>
                        </div>
                        {/* Прогресс-бар */}
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-orange-400'}`}
                            style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="mt-3 flex gap-2 justify-end">
                      {/* Кнопка история */}
                      <button
                        onClick={() => toggleSaleHistory(sale.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isHistoryOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-500'}`}>
                        <History className="w-3.5 h-3.5" />
                        История платежей {salePayments.length > 0 && `(${salePayments.length})`}
                        <ChevronRight className={`w-3 h-3 transition-transform ${isHistoryOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {!isPaid && (
                        <Button size="sm" onClick={() => openPayDialog(sale)} className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs px-3">
                          <DollarSign className="w-3 h-3 mr-1" /> Оплатить
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Инлайн история платежей */}
                  {isHistoryOpen && (
                    <div className="bg-slate-50 px-4 py-3 space-y-2">
                      {salePayments.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">Платежей по этой покупке нет</p>
                      ) : salePayments.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 shadow-sm">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-emerald-700">+{p.amount?.toLocaleString()} с.</p>
                            {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
                          </div>
                          <p className="text-xs text-slate-400 flex-shrink-0 text-right">
                            {format(new Date(p.payment_date || p.created_date), 'dd MMM yyyy', { locale: ru })}<br/>
                            <span className="text-slate-300">{format(new Date(p.payment_date || p.created_date), 'HH:mm')}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bulk Pay Dialog */}
        <Dialog open={bulkPayOpen} onOpenChange={(o) => { if (!o) { setBulkPayOpen(false); setBulkPayAmount(''); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Погасить часть долга</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-orange-50 rounded-xl text-sm space-y-1">
                <p className="text-slate-500">Клиент: <span className="font-semibold text-slate-900">{selectedCustomer?.name}</span></p>
                <p className="text-slate-500">Общий долг: <span className="font-bold text-orange-600">{(selectedCustomer?.total_debt || 0).toLocaleString()} с.</span></p>
                <p className="text-xs text-slate-400 mt-1">Система автоматически распределит сумму по покупкам, начиная с самых старых.</p>
              </div>
              <div>
                <Label>Сумма оплаты (сомони) *</Label>
                <Input
                  type="text" inputMode="decimal" pattern="[0-9.]*"
                  className="mt-1.5"
                  value={bulkPayAmount}
                  onChange={e => setBulkPayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="Введите сумму..."
                />
                {bulkPayAmount && parseFloat(bulkPayAmount) > 0 && (
                  parseFloat(bulkPayAmount) > (selectedCustomer?.total_debt || 0)
                    ? <p className="text-xs text-red-500 mt-1">⚠️ Сумма превышает долг клиента ({(selectedCustomer?.total_debt || 0).toLocaleString()} с.)</p>
                    : <p className="text-xs text-emerald-600 mt-1">Остаток после оплаты: {((selectedCustomer?.total_debt || 0) - parseFloat(bulkPayAmount)).toLocaleString()} с.</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setBulkPayOpen(false); setBulkPayAmount(''); }}>Отмена</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={bulkPaySaving || !bulkPayAmount || parseFloat(bulkPayAmount) <= 0 || parseFloat(bulkPayAmount) > (selectedCustomer?.total_debt || 0)}
                  onClick={handleBulkPayment}>
                  {bulkPaySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Погасить'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                    {payAmount && parseFloat(payAmount) > remaining && (
                      <p className="text-xs text-red-500 mt-1">⚠️ Сумма превышает остаток долга ({remaining.toLocaleString()} с.)</p>
                    )}
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
                      disabled={saving || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > remaining}
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

      {/* Поиск и сортировка */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t(lang, 'debts_search')} />
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'remaining_desc', label: 'Долг ↓' },
            { value: 'remaining_asc', label: 'Долг ↑' },
            { value: 'name_asc', label: 'А-Я' },
            { value: 'purchases_desc', label: 'Покупок ↓' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setSortDebtors(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${sortDebtors === opt.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Список клиентов */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {debtorList.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>{t(lang, 'debts_not_found')}</p>
          </div>
        ) : (
        <div className="overflow-y-auto max-h-[600px]">
          <div className="divide-y divide-slate-100">
        {debtorList.map(({ customer: c, sales: cSales, totalAmount, totalPaid, remaining }, idx) => {
          const isPaid = remaining <= 0;
          const unpaidSales = cSales.filter(s => {
            const paid = getSalePaidAmount(s.id);
            return (s.total_amount || 0) - paid > 0;
          });
          const dueDateStatus = !isPaid ? getDueDateStatus(unpaidSales) : null;
          const isOverdue = dueDateStatus === 'overdue';
          const isDueToday = dueDateStatus === 'today';

          return (
            <div key={c.id}
              onClick={() => setSelectedCustomer(c)}
              className={`p-4 cursor-pointer transition-all ${
                isOverdue
                  ? 'bg-red-50 hover:bg-red-100'
                  : isDueToday
                  ? 'bg-amber-50 hover:bg-amber-100'
                  : 'bg-white hover:bg-slate-50'
              }`}>
              {/* Номер строки + баннер срока */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-300 w-6 text-right flex-shrink-0">{idx + 1}</span>
                {(isOverdue || isDueToday) && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold flex-1 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {isOverdue ? '🔴 Просрочен срок оплаты!' : '🟡 Сегодня последний день оплаты!'}
                </div>
                )}
              </div>

              <div className="flex items-center gap-4 pl-8">
                {/* Аватар */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  isOverdue ? 'bg-red-200' : isDueToday ? 'bg-amber-200' : isPaid ? 'bg-emerald-100' : 'bg-orange-100'
                }`}>
                  <span className={`text-lg font-bold ${isOverdue ? 'text-red-700' : isDueToday ? 'text-amber-700' : isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {c.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    {isPaid && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Погашено</span>}
                  </div>
                  {c.phone && <p className="text-sm text-slate-400">{c.phone}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">{cSales.length} покупок</span>
                    {unpaidSales.length > 0 && (
                      <span className="text-xs text-orange-500 font-medium">{unpaidSales.length} не оплачено</span>
                    )}
                  </div>
                </div>

                {/* Долг */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-bold ${isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : isPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {remaining.toLocaleString()} с.
                  </p>
                  <p className="text-xs text-slate-400">из {totalAmount.toLocaleString()} с.</p>
                  <button
                    onClick={e => { e.stopPropagation(); setAddDebtData({ customer_id: c.id, new_customer_name: '', new_customer_phone: '', amount: '', note: '', is_new_customer: false }); setAddDebtOpen(true); }}
                    className="mt-1 text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-0.5 ml-auto"
                  >
                    <Plus className="w-3 h-3" /> долг
                  </button>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </div>

              {/* Прогресс-бар */}
              {totalAmount > 0 && (
                <div className="mt-3 ml-8 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-500' : isDueToday ? 'bg-amber-500' : isPaid ? 'bg-emerald-500' : 'bg-orange-400'}`}
                    style={{ width: `${Math.min(100, (totalPaid / totalAmount) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
          </div>
        </div>
        )}
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