import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bot, 
  Send, 
  Plus,
  MessageSquare,
  Trash2,
  Loader2,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      
      if (businesses.length > 0) {
        const biz = businesses[0];
        setBusiness(biz);
        setLang(biz.language || 'ru');
        
        // Загружаем все данные для AI
        const [products, sales, customers, warehouses, chatsData] = await Promise.all([
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.Warehouse.filter({ business_id: biz.id }),
          base44.entities.AIChat.filter({ business_id: biz.id })
        ]);

        // Расчёты для AI
        const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
        const totalBoxesSold = sales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
        const totalStock = products.reduce((sum, p) => sum + (p.boxes_in_stock || 0), 0);
        const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);

        // Топ товары
        const productSales = {};
        sales.forEach(sale => {
          if (!productSales[sale.product_id]) productSales[sale.product_id] = { boxes: 0, revenue: 0 };
          productSales[sale.product_id].boxes += sale.boxes_sold || 0;
          productSales[sale.product_id].revenue += sale.total_amount || 0;
        });

        const topProducts = Object.entries(productSales)
          .sort((a, b) => b[1].boxes - a[1].boxes)
          .slice(0, 5)
          .map(([id, data]) => {
            const p = products.find(pr => pr.id === id);
            return p ? `${p.brand} ${p.model}: ${data.boxes} коробок, ${data.revenue} сомони` : null;
          })
          .filter(Boolean);

        // Топ должники
        const topDebtors = customers
          .filter(c => (c.total_debt || 0) > 0)
          .sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0))
          .slice(0, 5)
          .map(c => `${c.name}: ${c.total_debt} сомони`);

        setBusinessData({
          businessName: biz.name,
          totalProducts: products.length,
          totalStock,
          totalSales,
          totalProfit,
          totalBoxesSold,
          totalDebt,
          customersCount: customers.length,
          warehousesCount: warehouses.length,
          topProducts,
          topDebtors,
          products: products.map(p => ({
            brand: p.brand,
            model: p.model,
            stock: p.boxes_in_stock,
            purchasePrice: p.purchase_price,
            salePrice: p.sale_price
          }))
        });

        setChats(chatsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        
        if (chatsData.length > 0) {
          setActiveChat(chatsData[0]);
          setMessages(chatsData[0].messages || []);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const newChat = await base44.entities.AIChat.create({
        business_id: business.id,
        title: 'Новый чат',
        messages: []
      });
      setChats([newChat, ...chats]);
      setActiveChat(newChat);
      setMessages([]);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const deleteChat = async (chatId) => {
    if (confirm('Удалить этот чат?')) {
      await base44.entities.AIChat.delete(chatId);
      const updatedChats = chats.filter(c => c.id !== chatId);
      setChats(updatedChats);
      if (activeChat?.id === chatId) {
        setActiveChat(updatedChats[0] || null);
        setMessages(updatedChats[0]?.messages || []);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !businessData) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      // Формируем контекст для AI
      const context = `
Ты AI-ассистент для бизнеса "${businessData.businessName}" по оптовой продаже обуви в Таджикистане.

ДАННЫЕ БИЗНЕСА:
- Всего товаров: ${businessData.totalProducts}
- Коробок на складе: ${businessData.totalStock}
- Общие продажи: ${businessData.totalSales.toLocaleString()} сомони
- Общая прибыль: ${businessData.totalProfit.toLocaleString()} сомони
- Продано коробок: ${businessData.totalBoxesSold}
- Общий долг клиентов: ${businessData.totalDebt.toLocaleString()} сомони
- Количество клиентов: ${businessData.customersCount}
- Количество складов: ${businessData.warehousesCount}

ТОП-5 ТОВАРОВ ПО ПРОДАЖАМ:
${businessData.topProducts.join('\n')}

ТОП ДОЛЖНИКОВ:
${businessData.topDebtors.length > 0 ? businessData.topDebtors.join('\n') : 'Нет должников'}

СПИСОК ТОВАРОВ:
${businessData.products.slice(0, 20).map(p => `${p.brand} ${p.model}: ${p.stock} коробок, закупка ${p.purchasePrice}с, продажа ${p.salePrice}с`).join('\n')}

Отвечай на русском языке. Будь полезным и давай конкретные рекомендации на основе данных.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${context}\n\nВопрос пользователя: ${input}`,
        response_json_schema: null
      });

      const assistantMessage = { 
        role: 'assistant', 
        content: response, 
        timestamp: new Date().toISOString() 
      };
      
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Сохраняем чат
      if (activeChat) {
        await base44.entities.AIChat.update(activeChat.id, {
          messages: updatedMessages,
          title: newMessages.length === 1 ? input.slice(0, 50) : activeChat.title
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Извините, произошла ошибка. Попробуйте ещё раз.', 
        timestamp: new Date().toISOString() 
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    'Сколько я заработал за последний месяц?',
    'Какие товары продаются лучше всего?',
    'Кто из клиентов имеет большие долги?',
    'Какие товары нужно закупить?',
    'Дай анализ моего бизнеса'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader 
        title="AI Ассистент"
        subtitle="Умный помощник для анализа вашего бизнеса"
      />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sidebar - Chat List */}
        <div className="hidden lg:flex w-72 flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <Button onClick={createNewChat} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              Новый чат
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chats.map(chat => (
              <div 
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat);
                  setMessages(chat.messages || []);
                }}
                className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 group ${
                  activeChat?.id === chat.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{chat.title || 'Новый чат'}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Привет! Я ваш AI-ассистент
                </h3>
                <p className="text-slate-500 mb-6 max-w-md">
                  Я могу анализировать ваш бизнес, отвечать на вопросы о продажах, 
                  товарах, клиентах и давать рекомендации
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3' 
                      : 'bg-slate-100 text-slate-900 rounded-2xl rounded-bl-md px-4 py-3'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-slate-500">Думаю...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Задайте вопрос..."
                disabled={sending || !activeChat}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={sending || !input.trim() || !activeChat || !businessData}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
            {!activeChat ? (
              <p className="text-sm text-slate-500 mt-2 text-center">
                Создайте новый чат, чтобы начать разговор
              </p>
            ) : !businessData ? (
              <p className="text-sm text-amber-500 mt-2 text-center">
                Загрузка данных бизнеса...
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}