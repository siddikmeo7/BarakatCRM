import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, Package, CreditCard, Zap, CheckCircle, 
  Loader2, AlertTriangle, Send, Clock, RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AutomationPanel({ business }) {
  const [lowStockSending, setLowStockSending] = useState(false);
  const [lowStockResult, setLowStockResult] = useState(null);

  const [debtSending, setDebtSending] = useState(false);
  const [debtResult, setDebtResult] = useState(null);

  const [debtDryRun, setDebtDryRun] = useState(null);
  const [debtDryRunLoading, setDebtDryRunLoading] = useState(false);

  // Check low stock now
  const handleCheckLowStock = async () => {
    setLowStockSending(true);
    setLowStockResult(null);
    try {
      // Get all products for this business
      const products = await base44.entities.Product.filter({ business_id: business.id });
      const limit = business.low_stock_limit ?? 2;
      const lowStock = products.filter(p => (p.boxes_in_stock ?? 0) <= limit);

      if (!lowStock.length) {
        setLowStockResult({ success: true, message: 'Все товары в норме. Уведомлений не отправлено.' });
        return;
      }

      // For each low stock product, invoke the function
      let notified = 0;
      for (const product of lowStock) {
        try {
          const res = await base44.functions.invoke('checkLowStockAlert', {
            event: { type: 'manual' },
            data: product
          });
          if (res.data?.success) notified++;
        } catch (_) {}
      }

      setLowStockResult({ 
        success: true, 
        message: `Найдено ${lowStock.length} товаров с низким остатком. Отправлено уведомлений: ${notified}.`,
        products: lowStock.map(p => `${p.brand} ${p.model} — ${p.boxes_in_stock} кор.`)
      });
    } catch (e) {
      setLowStockResult({ success: false, message: 'Ошибка: ' + e.message });
    } finally {
      setLowStockSending(false);
    }
  };

  // Preview debtors
  const handleDebtDryRun = async () => {
    setDebtDryRunLoading(true);
    setDebtDryRun(null);
    try {
      const customers = await base44.entities.Customer.filter({ business_id: business.id });
      const debtors = customers.filter(c => (c.total_debt || 0) > 0);
      setDebtDryRun(debtors);
    } catch (e) {
      setDebtDryRun([]);
    } finally {
      setDebtDryRunLoading(false);
    }
  };

  // Send debt reminders
  const handleSendDebtReminders = async () => {
    if (!confirm(`Отправить напоминания о долгах всем должникам?\nКлиентам с email придёт письмо, с Telegram — сообщение.`)) return;
    setDebtSending(true);
    setDebtResult(null);
    try {
      const res = await base44.functions.invoke('sendDebtReminders', { business_id: business.id });
      setDebtResult(res.data);
    } catch (e) {
      setDebtResult({ success: false, error: e.message });
    } finally {
      setDebtSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-bold text-slate-700">Автоматизация</p>
      </div>

      {/* === 1. Low Stock Notifications === */}
      <div className="bg-white rounded-xl border border-orange-100 overflow-hidden">
        <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-orange-700">1. Уведомления о низком остатке</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-700">
              <p className="font-medium mb-1">Как работает автоматически:</p>
              <p>При каждом обновлении товара система проверяет остаток. Если он ≤ <strong>{business.low_stock_limit ?? 2} кор.</strong>, владелец получит email-уведомление.</p>
              <p className="mt-1 text-orange-500">Лимит настраивается в разделе «Параметры по умолчанию».</p>
            </div>
          </div>

          <Button
            onClick={handleCheckLowStock}
            disabled={lowStockSending}
            variant="outline"
            className="w-full gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            {lowStockSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Проверить сейчас и отправить уведомления
          </Button>

          {lowStockResult && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              lowStockResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
            )}>
              {lowStockResult.success ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <AlertTriangle className="w-4 h-4 inline mr-1" />}
              {lowStockResult.message}
              {lowStockResult.products?.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {lowStockResult.products.map((p, i) => <li key={i} className="text-xs">• {p}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* === 2. Auto Sale Status Trigger === */}
      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-blue-700">2. Триггер изменения статуса долга</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-medium">Автоматические триггеры активны:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span>При поступлении оплаты → клиенту отправляется подтверждение в Telegram</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span>При полном погашении → клиенту отправляется уведомление о закрытии долга</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span>При просроченном долге → автоматическое напоминание клиенту</span>
                </div>
              </div>
              <p className="text-blue-500 mt-1">Эти триггеры срабатывают автоматически при регистрации оплаты в разделе «Долги».</p>
            </div>
          </div>
        </div>
      </div>

      {/* === 3. Debt Reminders === */}
      <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-red-700">3. Напоминания о задолженности</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <Clock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <p className="font-medium mb-1">Массовая рассылка напоминаний:</p>
              <p>Всем клиентам с активным долгом будет отправлено напоминание:</p>
              <ul className="mt-1 space-y-0.5">
                <li>• Email — если указан адрес клиента</li>
                <li>• Telegram — если указан username/ID клиента</li>
              </ul>
            </div>
          </div>

          {/* Preview debtors */}
          <Button
            onClick={handleDebtDryRun}
            disabled={debtDryRunLoading}
            variant="outline"
            size="sm"
            className="w-full gap-2 border-slate-200 text-slate-600"
          >
            {debtDryRunLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Предпросмотр — кому будет отправлено
          </Button>

          {debtDryRun !== null && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              {debtDryRun.length === 0 ? (
                <p className="text-sm text-slate-500 text-center">Нет клиентов с задолженностью</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Должники ({debtDryRun.length}):</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {debtDryRun.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 font-bold">{(c.total_debt || 0).toLocaleString('ru-RU')} сом.</span>
                          <span className="flex gap-1">
                            {c.email && <span title="Email" className="w-4 h-4 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs">✉</span>}
                            {c.telegram && <span title="Telegram" className="w-4 h-4 rounded bg-sky-100 text-sky-600 flex items-center justify-center text-xs">✈</span>}
                            {!c.email && !c.telegram && <span className="text-slate-400">нет контакта</span>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <Button
            onClick={handleSendDebtReminders}
            disabled={debtSending}
            className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            {debtSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Отправить напоминания всем должникам
          </Button>

          {debtResult && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              debtResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
            )}>
              {debtResult.success ? (
                <>
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Должников: {debtResult.debtors} · Уведомлений отправлено: {debtResult.sent}
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {debtResult.error || 'Ошибка при отправке'}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}