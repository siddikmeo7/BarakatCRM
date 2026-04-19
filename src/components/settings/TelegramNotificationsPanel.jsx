import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Send, CheckCircle } from 'lucide-react';

export default function TelegramNotificationsPanel({ business, onUpdate }) {
  const [chatId, setChatId] = useState(business?.telegram_chat_id || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      await base44.entities.Business.update(business.id, { telegram_chat_id: chatId.trim() });
      if (onUpdate) onUpdate({ ...business, telegram_chat_id: chatId.trim() });
      setTestResult({ success: true, msg: 'Chat ID сохранён!' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!chatId.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('notifyLowStockTelegram', {
        telegram_chat_id: chatId.trim(),
        business_name: business?.name || 'BarakatCRM',
        low_stock_items: [
          { brand: 'Тест Nike', model: 'Air Max', boxes_in_stock: 1 },
          { brand: 'Тест Adidas', model: 'Ultra', boxes_in_stock: 2 },
        ],
        type: 'low_stock'
      });
      if (res.data?.success) {
        setTestResult({ success: true, msg: '✅ Тестовое сообщение отправлено в Telegram!' });
      } else {
        setTestResult({ success: false, msg: '❌ Ошибка: ' + (res.data?.error || 'Проверьте Chat ID и бота') });
      }
    } catch (e) {
      setTestResult({ success: false, msg: '❌ Ошибка: ' + e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 border border-blue-200 bg-blue-50 rounded-xl">
      <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
        <Send className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-slate-900 mb-1">Telegram уведомления</h4>
        <p className="text-sm text-slate-500 mb-1">
          Получайте уведомления о малом остатке товаров и просроченных долгах прямо в Telegram.
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Узнать ваш Chat ID: напишите боту <b>@userinfobot</b> в Telegram — он пришлёт ваш ID.
        </p>
        <div className="flex gap-2">
          <Input
            value={chatId}
            onChange={e => setChatId(e.target.value.replace(/[^0-9-]/g, ''))}
            placeholder="Ваш Telegram Chat ID (например: 123456789)"
            className="flex-1 bg-white text-sm"
          />
          <Button size="sm" onClick={handleSave} disabled={saving || !chatId.trim()} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            {saving ? '...' : 'Сохранить'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !chatId.trim()} className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100">
            {testing ? '...' : 'Тест'}
          </Button>
        </div>
        {testResult && (
          <p className={`text-xs mt-2 font-medium ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
            {testResult.msg}
          </p>
        )}
        {business?.telegram_chat_id && !testResult && (
          <div className="flex items-center gap-1.5 mt-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-emerald-600 font-medium">
              Telegram подключён (ID: {business.telegram_chat_id}) — уведомления о малом остатке активны.
            </p>
          </div>
        )}
        <div className="mt-3 p-2 bg-white rounded-lg border border-blue-100 text-xs text-slate-500 space-y-0.5">
          <p className="font-semibold text-slate-700">Когда приходят уведомления:</p>
          <p>• Когда товар достигает лимита «мало на складе»</p>
          <p>• При просроченных долгах (раз в день)</p>
          <p>• При оплате долга клиентом</p>
        </div>
      </div>
    </div>
  );
}