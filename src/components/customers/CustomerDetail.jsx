import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import {
  ChevronLeft, Edit2, Trash2, Phone, Mail, MapPin, MessageCircle, Send,
  CreditCard, Wallet, ShoppingBag, UserCheck, Clock, FileText, Save, X, AlertCircle,
  DollarSign, Plus, History, ChevronRight, CheckCircle, Loader2, PackageX, User
} from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import ProductPhoto from '@/components/products/ProductPhoto';
import SaleNotifyChannels from '@/components/sales/SaleNotifyChannels';
import { buildPaymentMessage, buildDetailedPaymentMessage, notifyCustomerChannels, buildCustomerDebtReminder, sendWhatsApp } from '@/lib/customerNotify';
import { format, parseISO, isToday, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

const getSalePaidAmount = (saleId, payments) => {
  const salePayments = payments.filter(p => p.sale_id === saleId && (p.amount || 0) > 0);
  const fromPayments = salePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  return fromPayments;
};

const fmtDue = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function CustomerDetail({ customer, onBack, onEdit, onDelete, business, onCustomerUpdated }) {
  const { can } = useEmployeeAccess();
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deletedProducts, setDeletedProducts] = useState({}); // id → entity_data удалённого товара
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [addedByEmployee, setAddedByEmployee] = useState(null);

  // Debt management state
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [addDebtAmount, setAddDebtAmount] = useState('');
  const [addDebtNote, setAddDebtNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [payDialog, setPayDialog] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotifyChannels, setPayNotifyChannels] = useState([]);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [bulkPayAmount, setBulkPayAmount] = useState('');
  const [bulkNotifyChannels, setBulkNotifyChannels] = useState([]);
  const [bulkPaySaving, setBulkPaySaving] = useState(false);
  const [expandedSaleHistory, setExpandedSaleHistory] = useState({});
  const [editingDueDate, setEditingDueDate] = useState({});
  const [savingDueDate, setSavingDueDate] = useState(null);
  const [sendingMsg, setSendingMsg] = useState(false);

  const c = customer;

  useEffect(() => {
    setNotesValue(c.notes || '');
  }, [c.id, c.notes]);

  useEffect(() => {
    loadCustomerActivity();
  }, [c.id]);

  const loadCustomerActivity = async () => {
    try {
      const [salesData, paymentsData, productsData, employeesData, deletedLogs] = await Promise.all([
        base44.entities.Sale.filter({ customer_id: c.id }),
        base44.entities.DebtPayment.filter({ customer_id: c.id }),
        business?.id ? base44.entities.Product.filter({ business_id: business.id }) : Promise.resolve([]),
        business?.id ? base44.entities.Employee.filter({ business_id: business.id }) : Promise.resolve([]),
        business?.id ? base44.entities.ActivityLog.filter({ business_id: business.id, entity_type: 'Product', action_type: 'delete' }) : Promise.resolve([])
      ]);
      setSales(salesData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setPayments(paymentsData);
      setProducts(productsData);
      setEmployees(employeesData);
      // Карта удалённых товаров: id → entity_data (бренд, модель, фото и т.д.)
      const delMap = {};
      (deletedLogs || []).forEach(log => {
        if (log.entity_id && log.entity_data && !delMap[log.entity_id]) {
          delMap[log.entity_id] = log.entity_data;
        }
      });
      setDeletedProducts(delMap);

      if (c.added_by_employee_id) {
        try {
          const emp = await base44.entities.Employee.get(c.added_by_employee_id);
          if (emp) setAddedByEmployee(emp);
        } catch (_) {}
      }
    } catch (e) {
      console.error('Error loading customer activity:', e);
    } finally {
      setLoadingExtra(false);
    }
  };

  const getActor = () => {
    const emp = window.__barakatEmployee;
    if (emp) return { email: emp.user_email, name: emp.name, role: emp.is_admin ? 'admin' : 'employee' };
    return { email: '', name: 'Владелец', role: 'owner' };
  };

  const getCurrentUserContext = () => {
    const emp = window.__barakatEmployee;
    if (emp) {
      return {
        added_by_employee_id: emp.id, added_by_employee_name: emp.name,
        added_by_email: emp.user_email, added_by_role: emp.is_admin ? 'admin' : 'employee',
        seller_email: emp.user_email, seller_name: emp.name,
      };
    }
    return {
      added_by_employee_id: '', added_by_employee_name: 'Владелец',
      added_by_email: '', added_by_role: 'owner', seller_email: '', seller_name: 'Владелец',
    };
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await base44.entities.Customer.update(c.id, { notes: notesValue });
      setEditingNotes(false);
      if (onCustomerUpdated) onCustomerUpdated({ ...c, notes: notesValue });
    } catch (e) {
      console.error('Error saving notes:', e);
    } finally {
      setSavingNotes(false);
    }
  };

  // ===== Debt operations =====
  const debtSales = sales.filter(s => s.is_debt);
  const customerPayments = payments.filter(p => p.customer_id === c.id && p.amount > 0);

  const getSalePaid = (saleId) => getSalePaidAmount(saleId, payments);

  const totalDebtAmount = debtSales.filter(s => !s.is_cancelled).reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalPaidAmount = debtSales.reduce((sum, s) => sum + getSalePaid(s.id), 0);
  const totalRemaining = totalDebtAmount - totalPaidAmount;

  const handleAddDebt = async () => {
    if (!addDebtAmount || parseFloat(addDebtAmount) <= 0) return;
    setSaving(true);
    try {
      const userCtx = getCurrentUserContext();
      await base44.entities.Sale.create({
        business_id: business.id, product_id: 'manual', customer_id: c.id,
        boxes_sold: 0, total_amount: parseFloat(addDebtAmount), profit: 0,
        sale_date: new Date().toISOString(), is_debt: true, customer_name: c.name,
        seller_email: userCtx.seller_email, seller_name: userCtx.seller_name,
        edit_history: [], edit_count: 0
      });
      await base44.entities.Customer.update(c.id, {
        total_debt: (c.total_debt || 0) + parseFloat(addDebtAmount)
      });
      try {
        await base44.entities.ActivityLog.create({
          business_id: business.id, action_type: 'create', entity_type: 'Sale',
          entity_id: '', entity_data: { amount: addDebtAmount, note: addDebtNote, customer: c.name },
          user_email: userCtx.seller_email, user_name: userCtx.seller_name,
          description: `Добавлен долг ${addDebtAmount} с. клиенту ${c.name}`
        });
      } catch (_) {}
      setAddDebtOpen(false); setAddDebtAmount(''); setAddDebtNote('');
      await loadCustomerActivity();
      if (onCustomerUpdated) onCustomerUpdated({ ...c, total_debt: (c.total_debt || 0) + parseFloat(addDebtAmount) });
    } finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!payDialog || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    const { sale } = payDialog;
    const paidSoFar = getSalePaid(sale.id);
    const saleRemaining = (sale.total_amount || 0) - paidSoFar;
    if (amount > saleRemaining) return;

    setSaving(true);
    try {
      const newDebt = Math.max(0, (c.total_debt || 0) - amount);
      const [newPayment] = await Promise.all([
        base44.entities.DebtPayment.create({
          business_id: business.id, customer_id: c.id, sale_id: sale.id,
          amount, payment_date: new Date().toISOString()
        }),
        base44.entities.Customer.update(c.id, {
          total_debt: newDebt, total_paid: (c.total_paid || 0) + amount
        })
      ]);
      setPayments(prev => [...prev, newPayment]);
      const updated = { ...c, total_debt: newDebt, total_paid: (c.total_paid || 0) + amount };
      if (onCustomerUpdated) onCustomerUpdated(updated);

      if (payNotifyChannels.length > 0) {
        const paidName = sale.product_id === 'manual'
          ? 'Товары не указаны'
          : saleProductName(sale);
        const paidItems = [{ name: paidName, boxes: sale.boxes_sold || 0, amount }];
        // Оставшиеся непогашенные долги (другие продажи)
        const remainingItems = debtSales
          .filter(s => !s.is_cancelled && s.id !== sale.id && ((s.total_amount || 0) - getSalePaid(s.id)) > 0)
          .map(s => {
            const name = s.product_id === 'manual' ? 'Товары не указаны' : saleProductName(s);
            return { name, boxes: s.boxes_sold || 0, remaining: (s.total_amount || 0) - getSalePaid(s.id), dueDate: s.payment_due_date ? fmtDue(s.payment_due_date) : '' };
          });
        const nearestDueDate = remainingItems.map(r => r.dueDate).filter(Boolean).sort()[0] || '';
        const message = buildDetailedPaymentMessage({
          customerName: c.name, businessName: business?.name,
          now: new Date(), paidAmount: amount,
          paidItems, remainingItems,
          remainingDebt: newDebt, nearestDueDate
        });
        notifyCustomerChannels({ customer: c, channels: payNotifyChannels, message, emailSubject: `Оплата долга — ${business?.name || ''}` });
      }
      setPayDialog(null); setPayAmount(''); setPayNotifyChannels([]);
    } finally { setSaving(false); }
  };

  const handleBulkPayment = async () => {
    if (!bulkPayAmount) return;
    let remaining = parseFloat(bulkPayAmount);
    if (!remaining || remaining <= 0) return;
    if (remaining > totalRemaining) return;
    setBulkPaySaving(true);
    try {
      const unpaidSales = debtSales
        .filter(s => !s.is_cancelled && (s.total_amount || 0) - getSalePaid(s.id) > 0)
        .sort((a, b) => new Date(a.sale_date || a.created_date) - new Date(b.sale_date || b.created_date));
      const newPayments = [];
      let toDistribute = remaining;
      for (const sale of unpaidSales) {
        if (toDistribute <= 0) break;
        const saleRemaining = (sale.total_amount || 0) - getSalePaid(sale.id);
        const toApply = Math.min(toDistribute, saleRemaining);
        if (toApply > 0) {
          newPayments.push(base44.entities.DebtPayment.create({
            business_id: business.id, customer_id: c.id, sale_id: sale.id,
            amount: toApply, payment_date: new Date().toISOString(), note: 'Частичное погашение долга'
          }));
          toDistribute -= toApply;
        }
      }
      const created = await Promise.all(newPayments);
      const updatedCustomer = {
        ...c, total_debt: Math.max(0, (c.total_debt || 0) - remaining),
        total_paid: (c.total_paid || 0) + remaining
      };
      await base44.entities.Customer.update(c.id, {
        total_debt: updatedCustomer.total_debt, total_paid: updatedCustomer.total_paid
      });
      setPayments(prev => [...prev, ...created]);
      if (onCustomerUpdated) onCustomerUpdated(updatedCustomer);

      if (bulkNotifyChannels.length > 0) {
        // Пересчитываем остатки по всем долгам после распределения оплаты
        const appliedMap = {};
        created.forEach(p => { appliedMap[p.sale_id] = (appliedMap[p.sale_id] || 0) + (p.amount || 0); });
        const paidItems = [];
        const remainingItems = [];
        debtSales.filter(s => !s.is_cancelled).forEach(s => {
          const name = s.product_id === 'manual' ? 'Товары не указаны' : saleProductName(s);
          const beforePaid = getSalePaid(s.id);
          const extra = appliedMap[s.id] || 0;
          const totalPaidNow = beforePaid + extra;
          if (extra > 0) paidItems.push({ name, boxes: s.boxes_sold || 0, amount: extra });
          const rem = Math.max(0, (s.total_amount || 0) - totalPaidNow);
          if (rem > 0) remainingItems.push({ name, boxes: s.boxes_sold || 0, remaining: rem, dueDate: s.payment_due_date ? fmtDue(s.payment_due_date) : '' });
        });
        const nearestDueDate = remainingItems.map(r => r.dueDate).filter(Boolean).sort()[0] || '';
        const message = buildDetailedPaymentMessage({
          customerName: c.name, businessName: business?.name,
          now: new Date(), paidAmount: remaining,
          paidItems, remainingItems,
          remainingDebt: updatedCustomer.total_debt, nearestDueDate
        });
        notifyCustomerChannels({ customer: c, channels: bulkNotifyChannels, message, emailSubject: `Оплата долга — ${business?.name || ''}` });
      }
      setBulkPayOpen(false); setBulkPayAmount(''); setBulkNotifyChannels([]);
    } finally { setBulkPaySaving(false); }
  };

  const sendReminder = async () => {
    if (!c.phone) return;
    setSendingMsg(true);
    try {
      const msg = buildCustomerDebtReminder({ customer: c, sales, products, payments, businessName: business?.name });
      sendWhatsApp(c.phone, msg);
    } finally { setSendingMsg(false); }
  };

  const saveDueDate = async (saleId) => {
    setSavingDueDate(saleId);
    const newDate = editingDueDate[saleId] || null;
    await base44.entities.Sale.update(saleId, { payment_due_date: newDate });
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, payment_due_date: newDate } : s));
    setEditingDueDate(prev => { const n = { ...prev }; delete n[saleId]; return n; });
    setSavingDueDate(null);
  };

  const whatsappNum = c.use_phone_for_all ? c.phone : (c.whatsapp || c.phone);
  const telegramNum = c.use_phone_for_all ? c.phone : (c.telegram || c.phone);
  const activeSales = sales.filter(s => !s.is_cancelled);
  const totalPurchases = activeSales.length;
  const totalBoxes = activeSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Возвращает «товар» продажи: живой продукт либо снимок удалённого из журнала активности.
  // Гарантирует, что имя/фото купленного товара сохраняются даже после удаления карточки товара.
  const getSaleProduct = (sale) => {
    if (!sale || !sale.product_id || sale.product_id === 'manual') return null;
    const live = products.find(p => p.id === sale.product_id);
    if (live) return live;
    const snap = deletedProducts[sale.product_id];
    return snap || null;
  };
  const saleProductName = (sale) => {
    const p = getSaleProduct(sale);
    if (!p) return 'Товар удалён';
    return `${p.brand || ''} ${p.model || ''}`.trim() || 'Товар удалён';
  };

  // Responsible employee
  const sellerCounts = {};
  debtSales.forEach(s => {
    if (!s.is_cancelled && s.seller_email) sellerCounts[s.seller_email] = (sellerCounts[s.seller_email] || 0) + 1;
  });
  const topSellerEmail = Object.entries(sellerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const responsibleEmp = topSellerEmail ? employees.find(e => e.user_email === topSellerEmail) : null;

  const timeline = [
    ...debtSales.map(s => ({ type: 'sale', date: new Date(s.sale_date || s.created_date), data: s })),
    ...customerPayments.map(p => ({ type: 'payment', date: new Date(p.payment_date || p.created_date), data: p }))
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{c.name}</h1>
          <p className="text-xs text-slate-400">{can('view_customer_contacts') ? c.phone : '•••'}</p>
        </div>
        {can('manage_customers') && (
          <button onClick={() => onEdit(c)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        )}
        {can('delete_customers') && (
          <button onClick={() => { onDelete(c.id); onBack(); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>

      {/* Debt action buttons */}
      <div className="flex gap-2 flex-wrap">
        {can('add_debt_manual') && (
          <Button size="sm" variant="outline" onClick={() => setAddDebtOpen(true)}
            className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 flex-1">
            <Plus className="w-3.5 h-3.5" /> Прибавить долг
          </Button>
        )}
        {can('manage_debts') && totalRemaining > 0 && (
          <Button size="sm" onClick={() => { setBulkPayOpen(true); setBulkPayAmount(''); }}
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs flex-1">
            <DollarSign className="w-3.5 h-3.5" /> Погасить долг
          </Button>
        )}
        {can('send_debt_reminders') && (c.total_debt || 0) > 0 && whatsappNum && (
          <button onClick={sendReminder} disabled={sendingMsg}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-400 text-xs font-medium flex-1">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Финансовая сводка</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-0.5">Всего куплено в долг</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalDebtAmount.toLocaleString()} с.</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
            <p className="text-xs text-emerald-500 mb-0.5">Оплачено</p>
            <p className="text-lg font-bold text-emerald-600">{totalPaidAmount.toLocaleString()} с.</p>
          </div>
          <div className={`rounded-xl p-3 ${totalRemaining > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
            <p className={`text-xs mb-0.5 ${totalRemaining > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>Остаток долга</p>
            <p className={`text-lg font-bold ${totalRemaining > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
              {totalRemaining > 0 ? `${totalRemaining.toLocaleString()} с.` : '✅ 0 с.'}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <p className="text-xs text-blue-400 mb-0.5">Покупок в долг</p>
            <p className="text-lg font-bold text-blue-600">{debtSales.length}</p>
          </div>
        </div>
        {totalDebtAmount > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Прогресс оплаты</span>
              <span>{Math.round((totalPaidAmount / totalDebtAmount) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${totalRemaining <= 0 ? 'bg-emerald-500' : 'bg-orange-400'}`}
                style={{ width: `${Math.min(100, (totalPaidAmount / totalDebtAmount) * 100)}%` }} />
            </div>
          </div>
        )}
        {c.debt_limit && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-400">Лимит долга:</span>
            <span className={`font-semibold ${(c.total_debt || 0) >= c.debt_limit ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>
              {c.debt_limit.toLocaleString()} с. {(c.total_debt || 0) >= c.debt_limit && '⚠️'}
            </span>
          </div>
        )}
      </div>

      {/* Responsible employee */}
      {(responsibleEmp || c.added_by_employee_name || c.added_by_email) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> {topSellerEmail ? 'Ответственный сотрудник' : 'Кто добавил клиента'}
          </p>
          <div className="flex items-center gap-3">
            <EmployeeAvatar
              employee={topSellerEmail ? responsibleEmp : addedByEmployee}
              name={topSellerEmail ? (responsibleEmp?.name || c.added_by_employee_name) : (c.added_by_employee_name || c.added_by_email)}
              isAdmin={topSellerEmail ? responsibleEmp?.is_admin : (c.added_by_role === 'admin' || c.added_by_role === 'owner')}
              sizeClass="w-12 h-12 rounded-2xl text-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {topSellerEmail ? (responsibleEmp?.name || topSellerEmail) : (c.added_by_employee_name || c.added_by_email || 'Неизвестно')}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {topSellerEmail && <span className="text-[10px] text-slate-400 truncate">{topSellerEmail}</span>}
                {!topSellerEmail && c.added_by_role === 'owner' && (
                  <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-semibold">👑 Владелец</span>
                )}
                {!topSellerEmail && c.added_by_role === 'admin' && (
                  <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-semibold">🛡️ Админ</span>
                )}
                {!topSellerEmail && c.added_by_role === 'employee' && (
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-semibold">👤 Сотрудник</span>
                )}
                {topSellerEmail && <span className="text-[10px] text-slate-400">· клиент купил товары у этого сотрудника</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800">
          <div className="flex items-center gap-1.5 mb-1">
            <CreditCard className="w-3.5 h-3.5 text-orange-500" />
            <p className="text-xs text-slate-400">Долг</p>
          </div>
          {can('view_customer_debt') ? (
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{(c.total_debt || 0).toLocaleString()} с.</p>
          ) : <p className="text-xl font-bold text-slate-300">•••</p>}
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs text-slate-400">Оплачено</p>
          </div>
          {can('view_customer_debt') ? (
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{(c.total_paid || 0).toLocaleString()} с.</p>
          ) : <p className="text-xl font-bold text-slate-300">•••</p>}
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-slate-400">Покупок</p>
          </div>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalPurchases}</p>
          <p className="text-xs text-slate-400">{totalBoxes} коробок</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-100 dark:border-violet-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-xs text-slate-400">Добавлен</p>
          </div>
          <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{formatDate(c.created_date)}</p>
        </div>
      </div>

      {/* Contact Info */}
      {can('view_customer_contacts') ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Контакты</p>
          {c.phone && <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Phone className="w-4 h-4 text-slate-400" /> {c.phone}</p>}
          {c.email && <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Mail className="w-4 h-4 text-slate-400" /> {c.email}</p>}
          {c.address && <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><MapPin className="w-4 h-4 text-slate-400" /> {c.address}</p>}
          <div className="flex gap-2 pt-2">
            <a href={`https://wa.me/${whatsappNum?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a href={`https://t.me/${telegramNum?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-xl text-blue-700 dark:text-blue-400 text-sm font-medium">
              <Send className="w-4 h-4" /> Telegram
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">🔒 Контакты скрыты</p>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Примечание
          </p>
          {can('manage_customers') && !editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Изменить</button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea value={notesValue} onChange={e => setNotesValue(e.target.value)} placeholder="Кто это? Чем занимается?" rows={3} className="resize-none" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                <Save className="w-3.5 h-3.5" /> {savingNotes ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setNotesValue(c.notes || ''); }} className="gap-1.5">
                <X className="w-3.5 h-3.5" /> Отмена
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {c.notes || <span className="text-slate-300 dark:text-slate-600 italic">Нет примечания</span>}
          </p>
        )}
      </div>

      {/* Debt purchases with payment history */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Купленные товары в долг</h3>
          {debtSales.length > 0 && (
            <button
              onClick={() => {
                const allIds = debtSales.map(s => s.id);
                const allOpen = allIds.every(id => expandedSaleHistory[id]);
                const newState = {};
                allIds.forEach(id => { newState[id] = !allOpen; });
                setExpandedSaleHistory(newState);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
            >
              <History className="w-3.5 h-3.5" />
              {debtSales.every(s => expandedSaleHistory[s.id]) ? 'Скрыть' : 'Показать все'}
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loadingExtra ? (
            <p className="text-center text-slate-400 py-8 text-sm">Загрузка...</p>
          ) : debtSales.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Нет покупок в долг</p>
          ) : debtSales.map(sale => {
            const prod = getSaleProduct(sale);
            const paid = getSalePaid(sale.id);
            const remaining = (sale.total_amount || 0) - paid;
            const isPaid = remaining <= 0;
            const progress = sale.total_amount > 0 ? Math.min(100, (paid / sale.total_amount) * 100) : 0;
            const salePayments = payments.filter(p => p.sale_id === sale.id && p.amount > 0)
              .sort((a, b) => new Date(b.payment_date || b.created_date) - new Date(a.payment_date || a.created_date));
            const isHistoryOpen = !!expandedSaleHistory[sale.id];
            const isOverdue = sale.payment_due_date && !isPaid && startOfDay(new Date(sale.payment_due_date)) < startOfDay(new Date());
            const isDueToday = sale.payment_due_date && !isPaid && isToday(new Date(sale.payment_due_date));

            return (
              <div key={sale.id} className={`divide-y divide-slate-50 ${isPaid ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : isOverdue ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <ProductPhoto photoUrl={prod?.photo_url} brand={prod?.brand} className="w-11 h-11 rounded-xl flex-shrink-0" textClassName="text-[10px]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {sale.product_id === 'manual' ? (
                          <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 rounded-full text-[10px] font-semibold">
                              <PackageX className="w-3 h-3" /> Товары не указаны
                            </span>
                          </p>
                        ) : (
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{saleProductName(sale)}</p>
                        )}
                        {isPaid && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Погашен</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy', { locale: ru })}</p>

                      {/* Due date editing */}
                      {editingDueDate[sale.id] !== undefined ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <Input type="date" value={editingDueDate[sale.id]} onChange={e => setEditingDueDate(prev => ({ ...prev, [sale.id]: e.target.value }))} className="h-7 text-xs px-2 w-36" />
                          <button onClick={() => saveDueDate(sale.id)} disabled={savingDueDate === sale.id} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{savingDueDate === sale.id ? '...' : 'OK'}</button>
                          <button onClick={() => setEditingDueDate(prev => { const n = { ...prev }; delete n[sale.id]; return n; })} className="text-xs text-slate-400 hover:text-slate-600">Отмена</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          {sale.payment_due_date && !isPaid ? (
                            <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-slate-500'}`}>
                              📅 {format(new Date(sale.payment_due_date), 'dd MMM yyyy', { locale: ru })}{isOverdue ? ' — просрочено!' : isDueToday ? ' — сегодня!' : ''}
                            </p>
                          ) : !isPaid ? <p className="text-xs text-slate-300">Срок не указан</p> : null}
                          {!isPaid && can('manage_debts') && (
                            <button onClick={() => setEditingDueDate(prev => ({ ...prev, [sale.id]: sale.payment_due_date || '' }))} className="text-xs text-indigo-400 hover:text-indigo-600 underline">
                              {sale.payment_due_date ? 'Изменить' : '+ Срок'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Financial summary */}
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                          <p className="text-slate-400">Итого</p><p className="font-bold text-slate-800 dark:text-slate-100">{sale.total_amount?.toLocaleString()} с.</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                          <p className="text-emerald-500">Оплачено</p><p className="font-bold text-emerald-700">{paid.toLocaleString()} с.</p>
                        </div>
                        <div className={`rounded-lg p-2 text-center ${isPaid ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                          <p className={isPaid ? 'text-emerald-500' : 'text-orange-500'}>Долг</p>
                          <p className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-orange-700'}`}>{isPaid ? '✅ 0' : `${remaining.toLocaleString()} с.`}</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={() => setExpandedSaleHistory(prev => ({ ...prev, [sale.id]: !prev[sale.id] }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isHistoryOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      <History className="w-3.5 h-3.5" /> История {salePayments.length > 0 && `(${salePayments.length})`}
                      <ChevronRight className={`w-3 h-3 transition-transform ${isHistoryOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {!isPaid && can('manage_debts') && (
                      <Button size="sm" onClick={() => { setPayDialog({ sale }); setPayAmount(remaining.toString()); const def = business?.default_notify_channels; setPayNotifyChannels(Array.isArray(def) && def.length ? def : []); }} className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs px-3">
                        <DollarSign className="w-3 h-3 mr-1" /> Оплатить
                      </Button>
                    )}
                  </div>
                </div>
                {isHistoryOpen && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 space-y-2">
                    {salePayments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">Платежей нет</p>
                    ) : salePayments.map(p => (
                      <div key={p.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 shadow-sm">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-emerald-700">+{p.amount?.toLocaleString()} с.</p>
                          {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
                        </div>
                        <p className="text-xs text-slate-400 text-right">{format(new Date(p.payment_date || p.created_date), 'dd MMM yyyy', { locale: ru })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Other (non-debt) purchase history */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> Все покупки ({sales.length})
          </p>
        </div>
        {!loadingExtra && sales.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 mx-auto mb-1 opacity-50" /> Покупок пока нет
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
            {sales.slice(0, 15).map(sale => {
              const product = getSaleProduct(sale);
              return (
                <div key={sale.id} className="px-3 py-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sale.is_cancelled ? 'bg-red-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {sale.product_id === 'manual' ? 'Товары не указаны' : (product ? `${product.brand} ${product.model}` : 'Товар удалён')}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {sale.product_id === 'manual' ? 'долг без товара · ' : `${sale.boxes_sold || 0} кор. · `}
                      {formatDate(sale.sale_date)}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{(sale.total_amount || 0).toLocaleString()} с.</p>
                  {sale.is_debt && <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full text-[10px] font-semibold">Долг</span>}
                  {sale.is_cancelled && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full text-[10px] font-semibold">Отменён</span>}
                </div>
              );
            })}
            {sales.length > 15 && <div className="px-3 py-2 text-center text-xs text-slate-400">И ещё {sales.length - 15}...</div>}
          </div>
        )}
      </div>

      {/* Add Debt Dialog */}
      <Dialog open={addDebtOpen} onOpenChange={setAddDebtOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Прибавить долг — {c.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-sm">
              <p className="text-slate-500">Текущий долг: <span className="font-bold text-orange-600">{(c.total_debt || 0).toLocaleString()} с.</span></p>
            </div>
            <div>
              <Label>Сумма долга (сомони) *</Label>
              <Input className="mt-1.5" type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0" value={addDebtAmount}
                onChange={e => setAddDebtAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
              {addDebtAmount && parseFloat(addDebtAmount) > 0 && (
                <p className="text-xs text-orange-600 mt-1">Долг станет: {((c.total_debt || 0) + parseFloat(addDebtAmount)).toLocaleString()} с.</p>
              )}
            </div>
            <div>
              <Label>Примечание (необязательно)</Label>
              <Input className="mt-1.5" placeholder="Причина долга, товар и т.д." value={addDebtNote}
                onChange={e => setAddDebtNote(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setAddDebtOpen(false); setAddDebtAmount(''); setAddDebtNote(''); }}>Отмена</Button>
              <Button className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={saving || !addDebtAmount || parseFloat(addDebtAmount) <= 0} onClick={handleAddDebt}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Прибавить</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Pay Dialog */}
      <Dialog open={bulkPayOpen} onOpenChange={(o) => { if (!o) { setBulkPayOpen(false); setBulkPayAmount(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Погасить часть долга</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-sm space-y-1">
              <p className="text-slate-500">Клиент: <span className="font-semibold text-slate-900 dark:text-white">{c.name}</span></p>
              <p className="text-slate-500">Общий долг: <span className="font-bold text-orange-600">{(c.total_debt || 0).toLocaleString()} с.</span></p>
              <p className="text-xs text-slate-400 mt-1">Сумма распределится по покупкам, начиная с самых старых.</p>
            </div>
            <div>
              <Label>Сумма оплаты (сомони) *</Label>
              <Input type="text" inputMode="decimal" pattern="[0-9.]*" className="mt-1.5" value={bulkPayAmount}
                onChange={e => setBulkPayAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Введите сумму..." />
              {bulkPayAmount && parseFloat(bulkPayAmount) > 0 && (
                parseFloat(bulkPayAmount) > (c.total_debt || 0)
                  ? <p className="text-xs text-red-500 mt-1">⚠️ Превышает долг ({(c.total_debt || 0).toLocaleString()} с.)</p>
                  : <p className="text-xs text-emerald-600 mt-1">Остаток: {((c.total_debt || 0) - parseFloat(bulkPayAmount)).toLocaleString()} с.</p>
              )}
            </div>
            <SaleNotifyChannels channels={bulkNotifyChannels} onChange={setBulkNotifyChannels} customer={c} />
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setBulkPayOpen(false); setBulkPayAmount(''); setBulkNotifyChannels([]); }}>Отмена</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={bulkPaySaving || !bulkPayAmount || parseFloat(bulkPayAmount) <= 0 || parseFloat(bulkPayAmount) > (c.total_debt || 0)} onClick={handleBulkPayment}>
                {bulkPaySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Погасить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => { if (!o) { setPayDialog(null); setPayAmount(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Принять оплату</DialogTitle></DialogHeader>
          {payDialog && (() => {
            const { sale } = payDialog;
            const prod = getSaleProduct(sale);
            const paid = getSalePaid(sale.id);
            const remaining = (sale.total_amount || 0) - paid;
            return (
              <div className="space-y-4 py-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm space-y-1">
                  {prod && <p className="text-slate-500">Товар: <span className="font-medium text-slate-900 dark:text-white">{prod.brand} {prod.model}</span></p>}
                  <p className="text-slate-500">Сумма: <span className="font-medium text-slate-900 dark:text-white">{sale.total_amount?.toLocaleString()} с.</span></p>
                  <p className="text-slate-500">Оплачено: <span className="font-medium text-emerald-600">{paid.toLocaleString()} с.</span></p>
                  <p className="text-slate-500">Остаток: <span className="font-bold text-orange-600">{remaining.toLocaleString()} с.</span></p>
                </div>
                <div>
                  <Label>Сумма оплаты *</Label>
                  <Input type="text" inputMode="decimal" pattern="[0-9.]*" className="mt-1.5" value={payAmount}
                    onChange={e => setPayAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Введите сумму..." />
                  {payAmount && parseFloat(payAmount) > remaining && <p className="text-xs text-red-500 mt-1">⚠️ Превышает остаток ({remaining.toLocaleString()} с.)</p>}
                </div>
                <SaleNotifyChannels channels={payNotifyChannels} onChange={setPayNotifyChannels} customer={c} />
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => { setPayDialog(null); setPayAmount(''); }}>Отмена</Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saving || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > remaining} onClick={handlePayment}>
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