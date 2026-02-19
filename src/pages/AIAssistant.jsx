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
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
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
          <div className="max-w-3xl mx-auto">
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