import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Send, CheckCircle, Loader2, Plus, Trash2, User } from 'lucide-react';

export default function TelegramNotificationsPanel({ business, onUpdate }) {
  const initRecipients = () => {
    if (Array.isArray(business?.telegram_recipients) && business.telegram_recipients.length > 0) {
      return business.telegram_recipients;
    }
    if (business?.telegram_chat_id) {
      return [{ name: 'Владелец', chat_id: business.telegram_chat_id }];
    }
    return [];
  };

  const [recipients, setRecipients] = useState(initRecipients);
  const [newName, setNewName] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingIdx, setTestingIdx] = useState(null);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    setRecipients(initRecipients());
  }, [business?.id, business?.telegram_chat_id, JSON.stringify(business?.telegram_recipients)]);

  const handleAdd = () => {
    const id = newChatId.trim().replace(/[^0-9-]/g, '');
    if (!id) return;
    setRecipients(prev => [...prev, { name: newName.trim() || `Получатель ${prev.length + 1}`, chat_id: id }]);
    setNewName('');
    setNewChatId('');
  };

  const handleRemove = (idx) => {
    setRecipients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      await base44.entities.Business.update(business.id, {
        telegram_recipients: recipients,
        telegram_chat_id: recipients[0]?.chat_id || '',
      });
      if (onUpdate) onUpdate({ ...business, telegram_recipients: recipients, telegram_chat_id: recipients[0]?.chat_id || '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (idx) => {
    const r = recipients[idx];
    if (!r?.chat_id) return;
    setTestingIdx(idx);
    setTestResults(prev => ({ ...prev, [idx]: null }));
    try {
      const res = await base44.functions.invoke('notifyLowStockTelegram', {
        telegram_chat_id: r.chat_id,
        business_name: business?.name || 'BarakatCRM',
        low_stock_items: [{ brand: 'Тест Nike', model: 'Air Max', boxes_in_stock: 1 }],
        type: 'low_stock'
      });
      setTestResults(prev => ({
        ...prev,
        [idx]: res.data?.success
          ? { success: true, msg: '✅ Отправлено!' }
          : { success: false, msg: '❌ Ошибка' }
      }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [idx]: { success: false, msg: '❌ ' + e.message } }));
    } finally {
      setTestingIdx(null);
    }
  };

  return (
    <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Send className="w-4 h-4 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Telegram уведомления</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Узнать Chat ID: напишите <b>@userinfobot</b> в Telegram
          </p>
        </div>
      </div>

      {/* Список получателей */}
      {recipients.length > 0 && (
        <div className="space-y-1.5">
          {recipients.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-lg px-3 py-2">
              <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-24 truncate">{r.name}</span>
              <span className="text-xs text-slate-400 font-mono flex-1">{r.chat_id}</span>
              {testResults[idx] && (
                <span className={`text-[10px] font-medium flex-shrink-0 ${testResults[idx].success ? 'text-emerald-600' : 'text-red-500'}`}>
                  {testResults[idx].msg}
                </span>
              )}
              <button
                onClick={() => handleTest(idx)}
                disabled={testingIdx === idx}
                className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition flex-shrink-0 disabled:opacity-50"
              >
                {testingIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Тест'}
              </button>
              <button onClick={() => handleRemove(idx)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {recipients.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">Нет получателей. Добавьте Chat ID ниже.</p>
      )}

      {/* Добавить нового */}
      <div className="flex gap-2 items-center">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Имя (необяз.)"
          className="bg-white dark:bg-slate-800 text-xs h-8 w-28 flex-shrink-0"
        />
        <Input
          value={newChatId}
          onChange={e => setNewChatId(e.target.value)}
          placeholder="Chat ID..."
          className="bg-white dark:bg-slate-800 text-xs h-8 flex-1 font-mono"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={!newChatId.trim()} className="h-8 px-2 flex-shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8">
        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Сохранение...</> : saved ? <><CheckCircle className="w-3.5 h-3.5" />Сохранено!</> : 'Сохранить получателей'}
      </Button>

      {recipients.length > 0 && (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs text-emerald-600 font-medium">
            {recipients.length} получател{recipients.length === 1 ? 'ь' : 'ей'} настроено
          </p>
        </div>
      )}

      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700 text-xs text-slate-500 space-y-0.5">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Когда приходят уведомления:</p>
        <p>• Товар достиг лимита «мало на складе»</p>
        <p>• Просроченные долги (раз в день)</p>
        <p>• Оплата долга клиентом</p>
      </div>
    </div>
  );
}