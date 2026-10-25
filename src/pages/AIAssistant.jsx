import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Bot, Send, Plus, MessageSquare, Trash2, Loader2, Sparkles,
  Menu, X, Package, Users, ShoppingCart, TrendingUp, History,
  AlertTriangle, CheckCircle, Edit3, RotateCcw, ChevronDown, Lock
} from 'lucide-react';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function AIAssistant() {
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [businessData, setBusinessData] = useState(null);
  const [lang, setLang] = useState('ru');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataStats, setDataStats] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      // Поддержка как владельца, так и сотрудника
      const biz = window.__barakatBusiness;
      if (!biz) return;
      setBusiness(biz);
      setLang(biz.language || 'ru');

      const [products, sales, customers, warehouses, returns, activityLogs, chatsData, payments, employees, expenses, consignmentSales, consignmentProducts] = await Promise.all([
        base44.entities.Product.filter({ business_id: biz.id }),
        base44.entities.Sale.filter({ business_id: biz.id }),
        base44.entities.Customer.filter({ business_id: biz.id }),
        base44.entities.Warehouse.filter({ business_id: biz.id }),
        base44.entities.Return.filter({ business_id: biz.id }),
        base44.entities.ActivityLog.filter({ business_id: biz.id }),
        base44.entities.AIChat.filter({ business_id: biz.id }),
        base44.entities.DebtPayment.filter({ business_id: biz.id }),
        base44.entities.Employee.filter({ business_id: biz.id }),
        base44.entities.Expense.filter({ business_id: biz.id }),
        base44.entities.ConsignmentSale.filter({ business_id: biz.id }).catch(() => []),
        base44.entities.ConsignmentProduct.filter({ business_id: biz.id }).catch(() => []),
      ]);

      // --- Статистика ---
      const activeSales = sales.filter(s => !s.is_cancelled);
      const totalSales = activeSales.reduce((s, x) => s + (x.total_amount || 0), 0);
      const totalProfit = activeSales.reduce((s, x) => s + (x.profit || 0), 0);
      const totalBoxesSold = activeSales.reduce((s, x) => s + (x.boxes_sold || 0), 0);
      const totalStock = products.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
      const totalDebt = customers.reduce((s, c) => s + (c.total_debt || 0), 0);
      const cancelledSales = sales.filter(s => s.is_cancelled);
      const debtSales = activeSales.filter(s => s.is_debt);

      // Топ товаров
      const productSalesMap = {};
      activeSales.forEach(sale => {
        if (!productSalesMap[sale.product_id]) productSalesMap[sale.product_id] = { boxes: 0, revenue: 0, profit: 0 };
        productSalesMap[sale.product_id].boxes += sale.boxes_sold || 0;
        productSalesMap[sale.product_id].revenue += sale.total_amount || 0;
        productSalesMap[sale.product_id].profit += sale.profit || 0;
      });
      const topProducts = Object.entries(productSalesMap)
        .sort((a, b) => b[1].boxes - a[1].boxes)
        .map(([id, d], i) => {
          const p = products.find(pr => pr.id === id);
          return p ? `${i + 1}. ${p.brand} ${p.model} (${p.color}, ${p.size_from}-${p.size_to}р): продано ${d.boxes} кор., выручка ${d.revenue.toLocaleString()}с., прибыль ${d.profit.toLocaleString()}с.` : null;
        }).filter(Boolean);

      // Должники
      const topDebtors = customers
        .filter(c => (c.total_debt || 0) > 0)
        .sort((a, b) => b.total_debt - a.total_debt)
        .map(c => `${c.name} (тел: ${c.phone}): долг ${c.total_debt.toLocaleString()}с., оплачено ${(c.total_paid || 0).toLocaleString()}с.`);

      // Клиенты, полностью оплатившие (нет долгов)
      const paidInFullCustomers = customers
        .filter(c => (c.total_debt || 0) === 0 && (c.total_paid || 0) > 0)
        .sort((a, b) => (b.total_paid || 0) - (a.total_paid || 0))
        .map(c => `${c.name} (тел: ${c.phone}): оплачено ${(c.total_paid||0).toLocaleString()}с., долгов нет`);

      // Склады
      const warehouseInfo = warehouses.map(w => {
        const wProds = products.filter(p => p.warehouse_id === w.id);
        const boxes = wProds.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
        const value = wProds.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.purchase_price || 0), 0);
        return `Склад "${w.name}": ${wProds.length} товаров, ${boxes} коробок, стоимость ${value.toLocaleString()}с.`;
      });

      // История активности (последние 500 — для полноты ответов)
      const recentLogs = activityLogs
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 500)
        .map(log => {
          const typeMap = { create: 'Создан', update: 'Изменён', delete: 'Удалён' };
          const who = log.user_name || log.user_email || 'неизвестно';
          return `[${format(new Date(log.created_date), 'dd.MM.yy HH:mm')}] ${typeMap[log.action_type] || log.action_type} ${log.entity_type}: ${log.description || ''} → выполнил: ${who}`;
        });

      // Удалённые объекты (с указанием КЕМ удалено)
      const deletedLogs = activityLogs.filter(l => l.action_type === 'delete')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const deletedProducts = deletedLogs.filter(l => l.entity_type === 'Product').map(l => {
        const d = l.entity_data || {};
        const who = l.user_name || l.user_email || 'неизвестно';
        return `${d.brand || ''} ${d.model || ''} (${d.color || ''}, р.${d.size_from || ''}-${d.size_to || ''}) — удалён ${format(new Date(l.created_date), 'dd.MM.yy HH:mm')}, удалил: ${who}`;
      });
      const deletedCustomers = deletedLogs.filter(l => l.entity_type === 'Customer').map(l => {
        const d = l.entity_data || {};
        const who = l.user_name || l.user_email || 'неизвестно';
        return `${d.name || ''} тел.${d.phone || ''} — удалён(а) ${format(new Date(l.created_date), 'dd.MM.yy HH:mm')}, удалил: ${who}`;
      });
      const deletedSales = deletedLogs.filter(l => l.entity_type === 'Sale').map(l => {
        const d = l.entity_data || {};
        const who = l.user_name || l.user_email || 'неизвестно';
        return `${d.customer_name || 'Клиент'}: ${d.boxes_sold || 0} кор., ${d.total_amount || 0}с. — удалена ${format(new Date(l.created_date), 'dd.MM.yy HH:mm')}, удалил: ${who}`;
      });
      const deletedWarehouses = deletedLogs.filter(l => l.entity_type === 'Warehouse').map(l => {
        const d = l.entity_data || {};
        const who = l.user_name || l.user_email || 'неизвестно';
        return `Склад "${d.name || ''}" — удалён ${format(new Date(l.created_date), 'dd.MM.yy HH:mm')}, удалил: ${who}`;
      });

      // Все товары
      const allProductsInfo = products.map(p =>
        `${p.brand} ${p.model} | ${p.color} | р.${p.size_from}-${p.size_to} | ${p.boxes_in_stock}кор. | закупка ${p.purchase_price}с. | продажа ${p.sale_price}с. | склад: ${warehouses.find(w => w.id === p.warehouse_id)?.name || 'не указан'}`
      );

      // Все клиенты
      const allCustomersInfo = customers.map(c =>
        `${c.name} | тел.${c.phone} | долг ${(c.total_debt || 0).toLocaleString()}с. | оплачено ${(c.total_paid || 0).toLocaleString()}с.`
      );

      // Возвраты
      const returnsInfo = returns.map(r => {
        const p = products.find(pr => pr.id === r.product_id);
        return `Возврат ${r.boxes_returned} кор. товара ${p ? `${p.brand} ${p.model}` : 'неизвестный'}, сумма ${r.refund_amount}с., состояние: ${r.condition}`;
      });

      // Все продажи с деталями (последние 500)
      const recentSalesDetailed = activeSales
        .sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date))
        .slice(0, 500)
        .map(s => {
          const p = products.find(pr => pr.id === s.product_id);
          const c = customers.find(cu => cu.id === s.customer_id);
          const w = warehouses.find(wh => wh.id === s.warehouse_id);
          const sellerName = s.seller_name || s.seller_email || 'неизвестен';
          const dt = s.sale_date || s.created_date;
          const dateStr = dt ? format(new Date(dt), 'dd.MM.yyyy HH:mm') : 'дата неизвестна';
          const payType = s.is_debt ? (s.partial_payment > 0 ? `долг (предоплата ${s.partial_payment}с.)` : 'в долг') : 'наличный';
          return `[${dateStr}] ${p ? `${p.brand} ${p.model} (${p.color})` : 'Товар удалён'} | ${s.boxes_sold}кор. | сумма ${(s.total_amount||0).toLocaleString()}с. | ${payType} | клиент: ${c ? c.name : (s.customer_name || 'нет')} | склад: ${w ? w.name : '-'} | продавец: ${sellerName} | прибыль: ${(s.profit||0).toLocaleString()}с.`;
        });

      // Статистика по сотрудникам
      const employeeStatsMap = {};
      activeSales.forEach(s => {
        const empKey = s.created_by_id;
        if (!empKey) return;
        if (!employeeStatsMap[empKey]) employeeStatsMap[empKey] = { boxes: 0, revenue: 0, profit: 0, count: 0 };
        employeeStatsMap[empKey].boxes += s.boxes_sold || 0;
        employeeStatsMap[empKey].revenue += s.total_amount || 0;
        employeeStatsMap[empKey].profit += s.profit || 0;
        employeeStatsMap[empKey].count += 1;
      });
      const employeeStats = employees.map(emp => {
        const stats = employeeStatsMap[emp.id] || employeeStatsMap[emp.user_email] || { boxes: 0, revenue: 0, profit: 0, count: 0 };
        const lastActive = emp.last_login_at ? format(new Date(emp.last_login_at), 'dd.MM.yyyy HH:mm') : 'никогда';
        const status = emp.is_frozen ? 'ЗАМОРОЖЕН' : (emp.is_active ? 'активен' : 'неактивен');
        return `${emp.name} (${emp.is_admin ? 'Админ' : 'Сотрудник'}, ${status}): продаж ${stats.count}, коробок ${stats.boxes}, выручка ${stats.revenue.toLocaleString()}с., прибыль ${stats.profit.toLocaleString()}с. | тел: ${emp.phone || '-'} | последний вход: ${lastActive}`;
      });

      // Должники с деталями (кто ещё не заплатил)
      const activeDebtors = customers
        .filter(c => (c.total_debt || 0) > 0)
        .sort((a, b) => b.total_debt - a.total_debt)
        .map(c => {
          // Продажи этого клиента в долг
          const debtSales = activeSales.filter(s => s.is_debt && s.customer_id === c.id && !s.is_cancelled);
          const debtSalesStr = debtSales.map(s => {
            const p = products.find(pr => pr.id === s.product_id);
            const dt = s.sale_date || s.created_date;
            return `  → ${p ? `${p.brand} ${p.model}` : '?'} ${s.boxes_sold}кор. ${(s.total_amount||0).toLocaleString()}с. от ${dt ? format(new Date(dt), 'dd.MM.yy') : '?'}`;
          }).join('\n');
          return `ДОЛЖНИК: ${c.name} тел.${c.phone} | долг ${c.total_debt.toLocaleString()}с. | оплачено ${(c.total_paid||0).toLocaleString()}с.\n${debtSalesStr}`;
        });

      // Расходы
      const expensesInfo = expenses
        .sort((a, b) => new Date(b.expense_date||b.created_date) - new Date(a.expense_date||a.created_date))
        .slice(0, 100)
        .map(e => {
          const dt = e.expense_date || e.created_date;
          return `[${dt ? format(new Date(dt), 'dd.MM.yyyy') : '?'}] ${e.category}: ${(e.amount||0).toLocaleString()}с. — ${e.description || ''} (${e.recipient || ''})`;
        });
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

      // Платежи по долгам (все)
      const paymentsInfo = payments
        .sort((a, b) => new Date(b.payment_date || b.created_date) - new Date(a.payment_date || a.created_date))
        .slice(0, 300)
        .map(p => {
          const c = customers.find(cu => cu.id === p.customer_id);
          const dt = p.payment_date || p.created_date;
          return `[${dt ? format(new Date(dt), 'dd.MM.yyyy') : '?'}] ${c?.name || 'клиент'}: оплата ${(p.amount||0).toLocaleString()}с. ${p.note ? `(${p.note})` : ''}`;
        });

      // Продажи на реализации
      const activeConsignmentSales = (consignmentSales || []).filter(s => !s.is_cancelled);
      const consignmentSalesInfo = activeConsignmentSales
        .sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date))
        .slice(0, 200)
        .map(s => {
          const dt = s.sale_date || s.created_date;
          return `[${dt ? format(new Date(dt), 'dd.MM.yyyy') : '?'}] ${s.brand || ''} ${s.model || ''} | ${s.boxes_sold}кор. | сумма ${(s.total_amount||0).toLocaleString()}с. | прибыль продавца: ${(s.seller_profit||0).toLocaleString()}с. | владелец: ${s.owner_name || '?'} | продавец: ${s.seller_name || '?'}`;
        });
      const consignmentTotalProfit = activeConsignmentSales.reduce((s, x) => s + (x.seller_profit || 0), 0);
      const consignmentProductsInfo = (consignmentProducts || []).map(p =>
        `${p.brand} ${p.model} | владелец: ${p.owner_name} | ${p.boxes_in_stock}кор. | цена владельца: ${p.owner_price}с. | цена продажи: ${p.sale_price}с.`
      );

      setDataStats({
        totalProducts: products.length,
        totalStock,
        totalSales,
        totalProfit,
        totalBoxesSold,
        totalDebt,
        customersCount: customers.length,
        debtorsCount: customers.filter(c => (c.total_debt || 0) > 0).length,
        warehousesCount: warehouses.length,
        cancelledCount: cancelledSales.length,
        debtSalesCount: debtSales.length,
        returnsCount: returns.length,
        paymentsCount: payments.length,
        logsCount: activityLogs.length,
        employeesCount: employees.length,
      });

      setBusinessData({
        businessName: biz.name,
        totalSales, totalProfit, totalBoxesSold, totalStock, totalDebt,
        customersCount: customers.length, warehousesCount: warehouses.length,
        topProducts, topDebtors, paidInFullCustomers, warehouseInfo,
        allProductsInfo,
        allCustomersInfo,
        returnsInfo,
        recentLogs,
        deletedProducts,
        deletedCustomers,
        deletedSales,
        deletedWarehouses,
        recentSalesDetailed,
        employeeStats,
        activeDebtors,
        expensesInfo,
        totalExpenses,
        paymentsInfo,
        consignmentSalesInfo,
        consignmentProductsInfo,
        consignmentTotalProfit,
      });

      const sorted = chatsData.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
      setChats(sorted);
      if (sorted.length > 0) {
        setActiveChat(sorted[0]);
        setMessages(sorted[0].messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    if (!business) return;
    const newChat = await base44.entities.AIChat.create({
      business_id: business.id,
      title: t(lang, 'ai_new_chat'),
      messages: []
    });
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
    setMessages([]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectChat = (chat) => {
    setActiveChat(chat);
    setMessages(chat.messages || []);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!confirm(t(lang, 'ai_delete_chat'))) return;
    await base44.entities.AIChat.delete(chatId);
    const updated = chats.filter(c => c.id !== chatId);
    setChats(updated);
    if (activeChat?.id === chatId) {
      const next = updated[0] || null;
      setActiveChat(next);
      setMessages(next?.messages || []);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !businessData) return;

    let currentChat = activeChat;
    if (!currentChat) {
      currentChat = await base44.entities.AIChat.create({
        business_id: business.id,
        title: input.slice(0, 50),
        messages: []
      });
      setChats(prev => [currentChat, ...prev]);
      setActiveChat(currentChat);
    }

    const userMsg = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const langInstruction = t(lang, 'ai_lang_instruction');

      const context = `Ты — продвинутый AI-ассистент бизнеса "${businessData.businessName}" (система BarakatCRM).
${langInstruction}

ТЫ ЗНАЕШЬ АБСОЛЮТНО ВСЁ О БИЗНЕСЕ. У тебя есть полный доступ ко всем данным системы: продажи, товары, клиенты, сотрудники, склады, долги, расходы, возвраты, платежи, удаления, история действий. Ты можешь ответить на ЛЮБОЙ вопрос о бизнесе.

ПРАВИЛА ОТВЕТА:
1. Отвечай ТОЛЬКО на основе реальных данных из базы, приведённых ниже.
2. Если спрашивают "топ N" — отсортируй товары по нужному критерию и выведи ровно N штук.
3. Если спрашивают "что было удалено сегодня и кем" — найди в разделе "УДАЛЁННЫЕ ОБЪЕКТЫ" записи за сегодняшнюю дату и укажи КТО удалил (поле "удалил:").
4. Если спрашивают о должниках — используй раздел "ДОЛЖНИКИ", укажи имена, телефоны и суммы.
5. Если спрашивают "кто полностью оплатил" — используй раздел "КЛИЕНТЫ БЕЗ ДОЛГОВ".
6. Если спрашивают о конкретном сотруднике — ищи в "СТАТИСТИКА СОТРУДНИКОВ" и в "ИСТОРИИ ДЕЙСТВИЙ".
7. Если спрашивают о продажах за период — фильтруй по датам в "ПРОДАЖАХ".
8. ВСЕГДА указывай конкретные имена, даты, суммы — не общие фразы.
9. Форматируй ответ с заголовками, списками и таблицами для читаемости.
10. Если данных недостаточно — честно скажи, что не нашёл, и предложи уточнить вопрос.

=== ОБЩАЯ СТАТИСТИКА ===
- Товаров в базе: ${businessData.totalProducts || 0}
- Коробок на складе: ${businessData.totalStock || 0}
- Общая выручка: ${(businessData.totalSales||0).toLocaleString()} с.
- Общая прибыль: ${(businessData.totalProfit||0).toLocaleString()} с.
- Коробок продано: ${businessData.totalBoxesSold || 0}
- Общий долг клиентов: ${(businessData.totalDebt||0).toLocaleString()} с.
- Клиентов: ${businessData.customersCount || 0}
- Должников (есть долг): ${dataStats?.debtorsCount || 0}
- Клиентов без долгов (полностью оплатили): ${(businessData.paidInFullCustomers||[]).length}
- Сотрудников: ${dataStats?.employeesCount || 0}
- Складов: ${businessData.warehousesCount || 0}
- Возвратов: ${dataStats?.returnsCount || 0}
- Отменённых продаж: ${dataStats?.cancelledCount || 0}
- Общие расходы: ${(businessData.totalExpenses||0).toLocaleString()} с.
- Чистая прибыль (прибыль − расходы): ${((businessData.totalProfit||0) - (businessData.totalExpenses||0)).toLocaleString()} с.
- Прибыль с реализации (чужие товары): ${(businessData.consignmentTotalProfit||0).toLocaleString()} с.

=== СКЛАДЫ ===
${businessData.warehouseInfo.join('\n') || 'Нет складов'}

=== ВСЕ ТОВАРЫ (${(businessData.allProductsInfo||[]).length} шт.) ===
${(businessData.allProductsInfo||[]).join('\n') || 'Нет товаров'}

=== РЕЙТИНГ ТОВАРОВ ПО ПРОДАЖАМ (все товары, отсортированы) ===
${(businessData.topProducts||[]).join('\n') || 'Нет данных'}

=== ВСЕ КЛИЕНТЫ ===
${(businessData.allCustomersInfo||[]).join('\n') || 'Нет клиентов'}

=== КЛИЕНТЫ БЕЗ ДОЛГОВ (полностью оплатили всё) ===
${(businessData.paidInFullCustomers||[]).join('\n') || 'Нет клиентов без долгов'}

=== ДОЛЖНИКИ (кто ещё не заплатил, с детализацией продаж) ===
${(businessData.activeDebtors||[]).join('\n\n') || 'Должников нет'}

=== ПЛАТЕЖИ ПО ДОЛГАМ (последние 300) ===
${(businessData.paymentsInfo||[]).join('\n') || 'Платежей нет'}

=== СТАТИСТИКА СОТРУДНИКОВ ===
${(businessData.employeeStats||[]).join('\n') || 'Нет сотрудников'}

=== ПОСЛЕДНИЕ 500 ПРОДАЖ (с датой, временем, продавцом, клиентом, типом оплаты) ===
${(businessData.recentSalesDetailed||[]).join('\n') || 'Нет продаж'}

=== ВОЗВРАТЫ ===
${(businessData.returnsInfo||[]).join('\n') || 'Возвратов нет'}

=== РАСХОДЫ (последние 100) ===
${(businessData.expensesInfo||[]).join('\n') || 'Расходов нет'}

=== ПРОДАЖИ НА РЕАЛИЗАЦИИ (чужие товары, последние 200) ===
${(businessData.consignmentSalesInfo||[]).join('\n') || 'Нет продаж на реализации'}

=== ТОВАРЫ НА РЕАЛИЗАЦИИ ===
${(businessData.consignmentProductsInfo||[]).join('\n') || 'Нет товаров на реализации'}

=== УДАЛЁННЫЕ ТОВАРЫ (с указанием КЕМ удалено) ===
${(businessData.deletedProducts||[]).join('\n') || 'Нет удалённых товаров'}

=== УДАЛЁННЫЕ КЛИЕНТЫ (с указанием КЕМ удалено) ===
${(businessData.deletedCustomers||[]).join('\n') || 'Нет удалённых клиентов'}

=== УДАЛЁННЫЕ ПРОДАЖИ (с указанием КЕМ удалено) ===
${(businessData.deletedSales||[]).join('\n') || 'Нет удалённых продаж'}

=== УДАЛЁННЫЕ СКЛАДЫ (с указанием КЕМ удалено) ===
${(businessData.deletedWarehouses||[]).join('\n') || 'Нет удалённых складов'}

=== ИСТОРИЯ ВСЕХ ДЕЙСТВИЙ В СИСТЕМЕ (последние 500, с указанием КТО выполнил) ===
${(businessData.recentLogs||[]).join('\n') || 'Нет действий'}

История переписки (для контекста):
${newMessages.slice(-10).map(m => `${m.role === 'user' ? 'Пользователь' : 'AI'}: ${m.content}`).join('\n')}

Вопрос пользователя: ${userMsg.content}

Отвечай детально и по существу. Ищи точные данные в разделах выше. Если спрашивают о топ-N — выведи ровно N позиций из рейтинга. Если о датах — фильтруй по датам в записях. Если об удалениях — ищи в разделах "УДАЛЁННЫЕ" и указывай кто удалил.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt: context, model: 'claude_sonnet_4_6' });

      const assistantMsg = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      const isFirstMessage = newMessages.length === 1;
      const updatedChat = await base44.entities.AIChat.update(currentChat.id, {
        messages: updatedMessages,
        title: isFirstMessage ? userMsg.content.slice(0, 60) : currentChat.title
      });

      setChats(prev => {
        const without = prev.filter(c => c.id !== currentChat.id);
        return [{ ...currentChat, ...updatedChat, messages: updatedMessages }, ...without];
      });
      setActiveChat(prev => ({ ...prev, messages: updatedMessages }));
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t(lang, 'ai_error'),
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    t(lang, 'ai_q1'), t(lang, 'ai_q2'), t(lang, 'ai_q3'), t(lang, 'ai_q4'), t(lang, 'ai_q5'),
    lang === 'ru' ? 'Дай топ 25 самых продаваемых товаров' : 'Top 25 best selling products',
    lang === 'ru' ? 'Что было удалено сегодня и кем?' : 'What was deleted today and by whom?',
    lang === 'ru' ? 'Какие клиенты должны деньги?' : 'Which customers owe money?',
    lang === 'ru' ? 'Кто из клиентов полностью оплатил долги?' : 'Who fully paid their debts?',
  ];

  if (loading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!can('view_ai_assistant')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
          <Lock className="w-10 h-10 text-purple-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Нет доступа</h2>
        <p className="text-slate-400 max-w-sm text-sm">У вас нет разрешения на использование AI Ассистента. Обратитесь к владельцу бизнеса.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR - Hidden by default, toggle with small button */}
      <div className={`
        fixed z-50 left-0 top-0
        h-screen w-80 bg-white dark:bg-slate-900 flex flex-col
        transition-transform duration-300 overflow-hidden border-r border-slate-200 dark:border-slate-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            onClick={createNewChat}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-1 justify-center rounded-lg text-xs py-1 h-8"
          >
            <Plus className="w-3 h-3" />
            {t(lang, 'ai_new_chat')}
          </Button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {chats.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400 text-xs text-center py-8">{t(lang, 'ai_create_chat')}</p>
          )}
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                activeChat?.id === chat.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeChat?.id === chat.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className="flex-1 truncate">
                {chat.title || t(lang, 'ai_new_chat')}
              </span>
              <button
                onClick={(e) => deleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT - Full screen */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 overflow-hidden">

        {/* Chat Top Bar */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 bg-white dark:bg-slate-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title={t(lang, 'ai_new_chat')}
          >
            <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {activeChat?.title || 'BarakatCRM AI'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'ai_subtitle')}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t(lang, 'ai_greeting')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-md text-sm">{t(lang, 'ai_greeting_sub')}</p>
              {businessData && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full mb-6">
                  {lang === 'ru' ? `✓ ${dataStats?.totalProducts} товаров • ${dataStats?.customersCount} клиентов • ${dataStats?.logsCount} действий` : 'Data loaded'}
                </p>
              )}
              {/* Suggestions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-sm text-slate-700 dark:text-slate-300 group"
                  >
                    <span className="text-indigo-500 mr-2">✦</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.length === 1 && !sending ? (
            // После первого вопроса пока ждем ответ - показываем примеры
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t(lang, 'ai_thinking')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{t(lang, 'ai_greeting_sub')}</p>
            </div>
          ) : (
            <div className="w-full px-4 py-6 space-y-4">
              {messages.map((msg, i) => (
                 <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   {msg.role === 'assistant' && (
                     <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                       <Bot className="w-4 h-4 text-white" />
                     </div>
                   )}
                   <div className={`max-w-md ${msg.role === 'user' ? '' : ''}`}>
                     <div className={`rounded-lg px-4 py-2 text-sm ${
                       msg.role === 'user'
                         ? 'bg-indigo-600 text-white'
                         : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                     }`}>
                       {msg.role === 'assistant' ? (
                         <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2">
                           {msg.content}
                         </ReactMarkdown>
                       ) : (
                         <p className="break-words">{msg.content}</p>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
              {sending && (
                 <div className="flex gap-3 justify-start">
                   <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                     <Bot className="w-4 h-4 text-white" />
                   </div>
                   <div className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                     <span className="text-slate-600 dark:text-slate-400 text-sm">{t(lang, 'ai_thinking')}</span>
                   </div>
                 </div>
               )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <div className="w-full">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t(lang, 'ai_placeholder')}
                  disabled={sending || !businessData}
                  className="rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={sending || !input.trim() || !businessData}
                className="bg-indigo-600 hover:bg-indigo-700 rounded-lg h-10 w-10 p-0 flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}