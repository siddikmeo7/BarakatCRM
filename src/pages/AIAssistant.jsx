import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bot, Send, Plus, MessageSquare, Trash2, Loader2, Sparkles,
  Menu, X, Package, Users, ShoppingCart, TrendingUp, History,
  AlertTriangle, CheckCircle, Edit3, RotateCcw, ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function AIAssistant() {
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
      const user = await base44.auth.me();
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      if (businesses.length === 0) return;

      const biz = businesses[0];
      setBusiness(biz);
      setLang(biz.language || 'ru');

      const [products, sales, customers, warehouses, returns, activityLogs, chatsData, payments] = await Promise.all([
        base44.entities.Product.filter({ business_id: biz.id }),
        base44.entities.Sale.filter({ business_id: biz.id }),
        base44.entities.Customer.filter({ business_id: biz.id }),
        base44.entities.Warehouse.filter({ business_id: biz.id }),
        base44.entities.Return.filter({ business_id: biz.id }),
        base44.entities.ActivityLog.filter({ business_id: biz.id }),
        base44.entities.AIChat.filter({ business_id: biz.id }),
        base44.entities.DebtPayment.filter({ business_id: biz.id }),
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
        .sort((a, b) => b[1].boxes - a[1].boxes).slice(0, 10)
        .map(([id, d]) => {
          const p = products.find(pr => pr.id === id);
          return p ? `${p.brand} ${p.model} (${p.color}, ${p.size_from}-${p.size_to}р): продано ${d.boxes} кор., выручка ${d.revenue.toLocaleString()}с., прибыль ${d.profit.toLocaleString()}с.` : null;
        }).filter(Boolean);

      // Должники
      const topDebtors = customers
        .filter(c => (c.total_debt || 0) > 0)
        .sort((a, b) => b.total_debt - a.total_debt).slice(0, 10)
        .map(c => `${c.name} (тел: ${c.phone}): долг ${c.total_debt.toLocaleString()}с., оплачено ${(c.total_paid || 0).toLocaleString()}с.`);

      // Склады
      const warehouseInfo = warehouses.map(w => {
        const wProds = products.filter(p => p.warehouse_id === w.id);
        const boxes = wProds.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
        const value = wProds.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.purchase_price || 0), 0);
        return `Склад "${w.name}": ${wProds.length} товаров, ${boxes} коробок, стоимость ${value.toLocaleString()}с.`;
      });

      // История активности (последние 50)
      const recentLogs = activityLogs
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 50)
        .map(log => {
          const typeMap = { create: 'Создан', update: 'Изменён', delete: 'Удалён' };
          return `[${format(new Date(log.created_date), 'dd.MM.yy HH:mm')}] ${typeMap[log.action_type] || log.action_type} ${log.entity_type}: ${log.description || ''}`;
        });

      // Удалённые объекты
      const deletedLogs = activityLogs.filter(l => l.action_type === 'delete');
      const deletedProducts = deletedLogs.filter(l => l.entity_type === 'Product').map(l => {
        const d = l.entity_data || {};
        return `${d.brand || ''} ${d.model || ''} (удалён ${format(new Date(l.created_date), 'dd.MM.yy')})`;
      });
      const deletedCustomers = deletedLogs.filter(l => l.entity_type === 'Customer').map(l => {
        const d = l.entity_data || {};
        return `${d.name || ''} тел.${d.phone || ''} (удалён ${format(new Date(l.created_date), 'dd.MM.yy')})`;
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
      });

      setBusinessData({
        businessName: biz.name,
        totalSales, totalProfit, totalBoxesSold, totalStock, totalDebt,
        customersCount: customers.length, warehousesCount: warehouses.length,
        topProducts, topDebtors, warehouseInfo,
        allProductsInfo,
        allCustomersInfo,
        returnsInfo,
        recentLogs,
        deletedProducts,
        deletedCustomers,
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

      const context = `Ты AI-ассистент бизнеса "${businessData.businessName}" (оптовая продажа обуви в Таджикистане).
${langInstruction}

=== ОБЩАЯ СТАТИСТИКА ===
- Товаров в базе: ${businessData.totalProducts}
- Коробок на складе: ${businessData.totalStock}
- Общая выручка: ${businessData.totalSales.toLocaleString()} с.
- Общая прибыль: ${businessData.totalProfit.toLocaleString()} с.
- Коробок продано: ${businessData.totalBoxesSold}
- Общий долг клиентов: ${businessData.totalDebt.toLocaleString()} с.
- Клиентов: ${businessData.customersCount}
- Должников: ${dataStats?.debtorsCount || 0}
- Складов: ${businessData.warehousesCount}
- Возвратов: ${dataStats?.returnsCount || 0}
- Отменённых продаж: ${dataStats?.cancelledCount || 0}

=== СКЛАДЫ ===
${businessData.warehouseInfo.join('\n')}

=== ВСЕ ТОВАРЫ (${businessData.allProductsInfo.length} шт.) ===
${businessData.allProductsInfo.join('\n')}

=== ТОП-10 ТОВАРОВ ПО ПРОДАЖАМ ===
${businessData.topProducts.join('\n') || 'Нет данных'}

=== ВСЕ КЛИЕНТЫ ===
${businessData.allCustomersInfo.join('\n') || 'Нет клиентов'}

=== ТОП ДОЛЖНИКОВ ===
${businessData.topDebtors.join('\n') || 'Должников нет'}

=== ВОЗВРАТЫ ===
${businessData.returnsInfo.join('\n') || 'Возвратов нет'}

=== УДАЛЁННЫЕ ТОВАРЫ ===
${businessData.deletedProducts.join('\n') || 'Нет удалённых товаров'}

=== УДАЛЁННЫЕ КЛИЕНТЫ ===
${businessData.deletedCustomers.join('\n') || 'Нет удалённых клиентов'}

=== ПОСЛЕДНИЕ 50 ДЕЙСТВИЙ В СИСТЕМЕ ===
${businessData.recentLogs.join('\n') || 'Нет истории'}

История переписки этого чата (для контекста):
${newMessages.slice(-10).map(m => `${m.role === 'user' ? 'Пользователь' : 'AI'}: ${m.content}`).join('\n')}

Вопрос пользователя: ${userMsg.content}

Отвечай детально и по делу. Используй данные выше для точных ответов.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt: context });

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
    lang === 'ru' ? 'Покажи все удалённые товары' : lang === 'tj' ? 'Ҳамаи молҳои нестшударо нишон деҳ' : 'Show all deleted products',
    lang === 'ru' ? 'Какие изменения были сегодня?' : lang === 'tj' ? 'Имрӯз кадом тағйиротҳо буданд?' : 'What changes happened today?',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden flex-col lg:flex-row bg-white dark:bg-slate-950">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR - Telegram Style */}
      <div className={`
        fixed lg:relative z-50 lg:z-auto
        h-screen lg:h-full w-80 bg-white dark:bg-slate-900 flex flex-col
        transition-transform duration-300 overflow-hidden border-r border-slate-200 dark:border-slate-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-80 lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">BarakatCRM</h2>
            <button
              onClick={createNewChat}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Новый чат"
            >
              <Plus className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
          <Input
            placeholder="Поиск чата..."
            className="h-9 text-sm rounded-full bg-slate-100 dark:bg-slate-800 border-0 placeholder:text-slate-500 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto py-1 px-2">
          {chats.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{t(lang, 'ai_create_chat')}</p>
            </div>
          )}
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors duration-150 group ${
                activeChat?.id === chat.id
                  ? 'bg-slate-200 dark:bg-slate-800'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {chat.title || 'Новый чат'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {chat.messages && chat.messages.length > 0
                    ? chat.messages[chat.messages.length - 1].content.slice(0, 40)
                    : 'Нет сообщений'}
                </p>
              </div>
              <button
                onClick={(e) => deleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-opacity flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT - Telegram Style */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 overflow-hidden lg:ml-0">

        {/* Chat Top Bar */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 bg-white dark:bg-slate-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {activeChat?.title || 'BarakatCRM AI'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 px-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-6">
                <Sparkles className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t(lang, 'ai_greeting')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm text-sm">{t(lang, 'ai_greeting_sub')}</p>
              {businessData && (
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-xs font-medium mb-6">
                  {lang === 'ru' ? `${dataStats?.totalProducts} товаров • ${dataStats?.customersCount} клиентов • ${dataStats?.logsCount} действий` : 'Data loaded'}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 space-y-3">
              {messages.map((msg, i) => (
                 <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${msg.role === 'user' ? '' : ''}`}>
                     <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                       msg.role === 'user'
                         ? 'bg-blue-500 text-white rounded-br-none'
                         : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none'
                     }`}>
                       {msg.role === 'assistant' ? (
                         <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-ul:my-1 prose-li:my-0 prose-headings:my-1 prose-headings:text-sm prose-a:text-blue-600 dark:prose-a:text-blue-400">
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
                <div className="flex gap-2 justify-start">
                  <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-bl-none px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Сообщение..."
                disabled={sending || !businessData}
                className="h-9 text-sm rounded-full bg-slate-100 dark:bg-slate-800 border-0 px-4 placeholder:text-slate-500 dark:placeholder:text-slate-500 dark:text-white"
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={sending || !input.trim() || !businessData}
              className="bg-blue-500 hover:bg-blue-600 rounded-full h-9 w-9 p-0 flex-shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}