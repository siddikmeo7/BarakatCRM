import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import {
  ChevronLeft, Edit2, Trash2, Phone, Mail, MapPin, MessageCircle, Send,
  CreditCard, Wallet, ShoppingBag, UserCheck, Clock, FileText, Save, X, AlertCircle,
  DollarSign
} from 'lucide-react';

export default function CustomerDetail({ customer, onBack, onEdit, onDelete, business }) {
  const { can } = useEmployeeAccess();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotesValue(customer.notes || '');
  }, [customer.id, customer.notes]);

  useEffect(() => {
    loadCustomerActivity();
  }, [customer.id]);

  const loadCustomerActivity = async () => {
    try {
      const [salesData, paymentsData, productsData] = await Promise.all([
        base44.entities.Sale.filter({ customer_id: customer.id }),
        base44.entities.DebtPayment.filter({ customer_id: customer.id }),
        business?.id ? base44.entities.Product.filter({ business_id: business.id }) : Promise.resolve([])
      ]);
      setSales(salesData);
      setPayments(paymentsData);
      setProducts(productsData);
    } catch (e) {
      console.error('Error loading customer activity:', e);
    } finally {
      setLoadingExtra(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await base44.entities.Customer.update(customer.id, { notes: notesValue });
      customer.notes = notesValue;
      setEditingNotes(false);
    } catch (e) {
      console.error('Error saving notes:', e);
    } finally {
      setSavingNotes(false);
    }
  };

  const c = customer;
  const whatsappNum = c.use_phone_for_all ? c.phone : (c.whatsapp || c.phone);
  const telegramNum = c.use_phone_for_all ? c.phone : (c.telegram || c.phone);

  const activeSales = sales.filter(s => !s.is_cancelled);
  const totalPurchases = activeSales.length;
  const totalBoxes = activeSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

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

      {/* Pay Debt Button — redirects to Debts page for this customer */}
      {can('view_customer_debt') && (c.total_debt || 0) > 0 && can('manage_debts') && (
        <Button
          onClick={() => navigate(createPageUrl('Debts') + `?customerId=${c.id}&from=customers`)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-11"
        >
          <DollarSign className="w-4 h-4" />
          Погасить долг клиента — {(c.total_debt || 0).toLocaleString()} с.
        </Button>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800">
          <div className="flex items-center gap-1.5 mb-1">
            <CreditCard className="w-3.5 h-3.5 text-orange-500" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Долг</p>
          </div>
          {can('view_customer_debt') ? (
            <>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{(c.total_debt || 0).toLocaleString()} с.</p>
              {c.debt_limit && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Лимит: {c.debt_limit.toLocaleString()} с.</p>}
            </>
          ) : (
            <p className="text-xl font-bold text-slate-300">•••</p>
          )}
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Оплачено</p>
          </div>
          {can('view_customer_debt') ? (
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{(c.total_paid || 0).toLocaleString()} с.</p>
          ) : (
            <p className="text-xl font-bold text-slate-300">•••</p>
          )}
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Покупок</p>
          </div>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalPurchases}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{totalBoxes} коробок</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-100 dark:border-violet-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Добавлен</p>
          </div>
          <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{formatDate(c.created_date)}</p>
        </div>
      </div>

      {/* Who Added This Client */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5" /> Кто добавил клиента
        </p>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            c.added_by_role === 'owner'
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
              : c.added_by_role === 'admin'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-slate-400 to-slate-500'
          }`}>
            <span className="text-white font-bold text-sm">
              {(c.added_by_employee_name || c.added_by_email || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {c.added_by_employee_name || c.added_by_email || 'Неизвестно'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {c.added_by_role === 'owner' && (
                <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-semibold">👑 Владелец</span>
              )}
              {c.added_by_role === 'admin' && (
                <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-semibold">🛡️ Админ</span>
              )}
              {c.added_by_role === 'employee' && (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-semibold">👤 Сотрудник</span>
              )}
              {c.added_by_email && (
                <span className="text-[10px] text-slate-400 truncate">{c.added_by_email}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {can('view_customer_contacts') ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Контакты</p>
          {c.phone && (
            <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" /> {c.phone}
            </p>
          )}
          {c.email && (
            <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" /> {c.email}
            </p>
          )}
          {c.address && (
            <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" /> {c.address}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <a href={`https://wa.me/${whatsappNum?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a href={`https://t.me/${telegramNum?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-blue-700 dark:text-blue-400 text-sm font-medium transition-colors">
              <Send className="w-4 h-4" /> Telegram
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">🔒 Контакты скрыты</p>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Примечание о клиенте
          </p>
          {can('manage_customers') && !editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Изменить
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              placeholder="Кто это? Чем занимается? Регулярный покупатель?"
              rows={3}
              className="resize-none"
            />
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

      {/* Purchase History (recent) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> История покупок ({sales.length})
          </p>
        </div>
        {loadingExtra ? (
          <div className="p-3 text-center text-xs text-slate-400">Загрузка...</div>
        ) : sales.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
            <AlertCircle className="w-4 h-4 mx-auto mb-1 opacity-50" />
            Покупок пока нет
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
            {sales.slice(0, 15).map(sale => {
              const product = products.find(p => p.id === sale.product_id);
              return (
              <div key={sale.id}
                   className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                   onClick={() => product && navigate(createPageUrl('ProductDetail') + `?id=${product.id}`)}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sale.is_cancelled ? 'bg-red-400' : 'bg-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {product ? `${product.brand} ${product.model}` : 'Товар удалён'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {sale.boxes_sold || 0} кор. × {(sale.sale_price || 0).toLocaleString()} с. · {formatDate(sale.sale_date)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{(sale.total_amount || 0).toLocaleString()} с.</p>
                </div>
                {sale.is_debt && (
                  <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-semibold">Долг</span>
                )}
                {sale.is_cancelled && (
                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-semibold">Отменён</span>
                )}
              </div>
              );
            })}
            {sales.length > 15 && (
              <div className="px-3 py-2 text-center text-xs text-slate-400">И ещё {sales.length - 15}...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}