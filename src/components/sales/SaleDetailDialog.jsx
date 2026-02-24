import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CustomerSearchSelect from '@/components/search/CustomerSearchSelect';
import { 
  Package, Edit2, Trash2, Clock, AlertTriangle, 
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, CreditCard
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const MAX_EDITS = 5;

export default function SaleDetailDialog({ sale, product, customer, onClose, onUpdated }) {
  const [mode, setMode] = useState('view'); // view | edit | cancel | to_debt
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editData, setEditData] = useState({
    boxes_sold: sale.boxes_sold,
    sale_price: sale.sale_price,
    note: ''
  });
  const [debtData, setDebtData] = useState({
    customer_id: '',
    partial_payment: ''
  });
  const [allCustomers, setAllCustomers] = useState([]);

  useEffect(() => {
    // Загружаем всех клиентов бизнеса для поиска
    base44.entities.Customer.filter({ business_id: sale.business_id }).then(setAllCustomers).catch(() => {});
  }, [sale.business_id]);

  if (!sale) return null;

  const editCount = sale.edit_count || 0;
  const editsLeft = MAX_EDITS - editCount;
  const canEdit = !sale.is_cancelled && editsLeft > 0;
  const editHistory = sale.edit_history || [];

  const pairsPerBox = product?.pairs_per_box || 6;
  const newPairs = (editData.boxes_sold || 0) * pairsPerBox;
  const newItems = newPairs * 2;
  const newTotal = (editData.boxes_sold || 0) * (parseFloat(editData.sale_price) || 0);
  const newProfit = (editData.boxes_sold || 0) * ((parseFloat(editData.sale_price) || 0) - (sale.purchase_price || 0));

  const handleEdit = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const newBoxes = parseInt(editData.boxes_sold) || 0;
      const newPrice = parseFloat(editData.sale_price) || 0;

      // Строим список изменений
      const changes = [];
      if (newBoxes !== sale.boxes_sold) {
        changes.push({ label: 'Коробок', from: sale.boxes_sold, to: newBoxes });
      }
      if (newPrice !== sale.sale_price) {
        changes.push({ label: 'Цена/кор.', from: `${sale.sale_price?.toLocaleString()} с.`, to: `${newPrice.toLocaleString()} с.` });
      }
      if (newTotal !== sale.total_amount) {
        changes.push({ label: 'Итого', from: `${sale.total_amount?.toLocaleString()} с.`, to: `${newTotal.toLocaleString()} с.` });
      }

      const historyEntry = {
        edited_at: new Date().toISOString(),
        boxes_sold: sale.boxes_sold,
        sale_price: sale.sale_price,
        total_amount: sale.total_amount,
        profit: sale.profit,
        note: editData.note || 'Без комментария',
        changes
      };

      const boxDiff = newBoxes - sale.boxes_sold;
      await base44.entities.Sale.update(sale.id, {
        boxes_sold: newBoxes,
        pairs_sold: newPairs,
        items_sold: newItems,
        sale_price: newPrice,
        total_amount: newTotal,
        profit: newProfit,
        edit_count: editCount + 1,
        edit_history: [...editHistory, historyEntry]
      });

      // Логируем в ActivityLog
      try {
        const user = await base44.auth.me();
        await base44.entities.ActivityLog.create({
          business_id: sale.business_id,
          action_type: 'update',
          entity_type: 'Sale',
          entity_id: sale.id,
          entity_data: {
            changes,
            old: { boxes_sold: sale.boxes_sold, sale_price: sale.sale_price, total_amount: sale.total_amount },
            new: { boxes_sold: newBoxes, sale_price: newPrice, total_amount: newTotal },
            note: editData.note
          },
          user_email: user.email,
          description: `Обновлена продажа (${changes.map(c => `${c.label}: ${c.from} → ${c.to}`).join(', ')})`
        });
      } catch (_) {}

      // Обновляем остаток на складе
      if (boxDiff !== 0 && product) {
        const currentStock = product.boxes_in_stock || 0;
        await base44.entities.Product.update(product.id, {
          boxes_in_stock: Math.max(0, currentStock - boxDiff)
        });
      }

      // Если долговая продажа — корректируем долг клиента на разницу сумм
      if (sale.is_debt && customer) {
        // Получаем все платежи по продаже (DebtPayment с sale_id === sale.id)
        const paymentsForSale = await base44.entities.DebtPayment.filter({ sale_id: sale.id });
        const totalPaid = paymentsForSale.reduce((sum, p) => sum + (p.amount || 0), 0) + (sale.partial_payment || 0);
        const oldTotalDebt = sale.total_amount;
        const newTotalDebt = newTotal;
        const debtDiff = newTotalDebt - oldTotalDebt; // может быть + или -

        // Корректируем total_debt клиента на debtDiff
        await base44.entities.Customer.update(customer.id, {
          total_debt: Math.max(0, (customer.total_debt || 0) + debtDiff)
        });
      }

      onUpdated();
      setMode('view');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setSaving(true);
    try {
      await base44.entities.Sale.update(sale.id, {
        is_cancelled: true,
        cancelled_at: new Date().toISOString()
      });

      // Возвращаем товар на склад
      if (product) {
        await base44.entities.Product.update(product.id, {
          boxes_in_stock: (product.boxes_in_stock || 0) + sale.boxes_sold
        });
      }

      // Если долг — вычитаем из долга клиента только ОСТАВШИЙСЯ непогашенный долг
      // (все реальные платежи через DebtPayment уже учтены в customer.total_paid/total_debt)
      if (sale.is_debt && customer) {
        // Получаем все фактически совершённые платежи по этой продаже
        const paymentsForSale = await base44.entities.DebtPayment.filter({ sale_id: sale.id });
        const alreadyPaid = paymentsForSale.reduce((sum, p) => sum + (p.amount || 0), 0);
        // Начальный долг = total_amount - partial_payment (уже уплачено при создании продажи)
        const initialDebt = sale.total_amount - (sale.partial_payment || 0);
        // Непогашенный остаток = total_amount - all payments - partial_payment
        const remainingDebt = Math.max(0, initialDebt - alreadyPaid);

        await base44.entities.Customer.update(customer.id, {
          total_debt: Math.max(0, (customer.total_debt || 0) - remainingDebt),
          // Возвращаем partial_payment обратно (он был зачислен как total_paid при продаже)
          total_paid: Math.max(0, (customer.total_paid || 0) - (sale.partial_payment || 0) - alreadyPaid)
        });
      }

      onUpdated();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToDebt = async () => {
    if (!debtData.customer_id) return;
    setSaving(true);
    try {
      const partialPay = parseFloat(debtData.partial_payment) || 0;
      const remainingDebt = sale.total_amount - partialPay;

      // Получаем данные клиента
      const customerRecords = await base44.entities.Customer.filter({ id: debtData.customer_id });
      const selectedCustomer = customerRecords[0];

      // Обновляем продажу — меняем тип оплаты на долг
      await base44.entities.Sale.update(sale.id, {
        is_debt: true,
        customer_id: debtData.customer_id,
        partial_payment: partialPay,
        edit_count: (sale.edit_count || 0) + 1,
        edit_history: [...(sale.edit_history || []), {
          edited_at: new Date().toISOString(),
          boxes_sold: sale.boxes_sold,
          sale_price: sale.sale_price,
          total_amount: sale.total_amount,
          profit: sale.profit,
          note: 'Изменён тип оплаты: Наличные → В долг',
          changes: [{ label: 'Тип оплаты', from: 'Наличные', to: 'В долг' }]
        }]
      });

      // Обновляем долг клиента
      if (selectedCustomer) {
        await base44.entities.Customer.update(debtData.customer_id, {
          total_debt: (selectedCustomer.total_debt || 0) + remainingDebt,
          total_paid: (selectedCustomer.total_paid || 0) + partialPay
        });

        // Если есть частичная оплата — записываем в историю платежей
        if (partialPay > 0) {
          await base44.entities.DebtPayment.create({
            business_id: sale.business_id,
            customer_id: debtData.customer_id,
            sale_id: sale.id,
            amount: partialPay,
            note: 'Частичная оплата при изменении типа на долг',
            payment_date: new Date().toISOString()
          });
        }
      }

      onUpdated();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Детали продажи
            {sale.is_cancelled && (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full font-normal">
                Отменена
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Товар */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            {product?.photo_url ? (
              <img src={product.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center">
                <Package className="w-7 h-7 text-slate-400" />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900">{product?.brand} {product?.model}</p>
              <p className="text-sm text-slate-500">{product?.color} • {product?.product_type}</p>
              <p className="text-xs text-slate-400">
                {format(parseISO(sale.sale_date || sale.created_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
              </p>
            </div>
          </div>

          {/* Цифры */}
          {mode === 'view' ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Коробок', value: sale.boxes_sold, color: 'text-indigo-600' },
                { label: 'Пар', value: sale.pairs_sold || sale.boxes_sold * pairsPerBox, color: 'text-slate-700' },
                { label: 'Цена / коробка', value: `${sale.sale_price?.toLocaleString()} с.`, color: 'text-slate-700' },
                { label: 'Итого', value: `${sale.total_amount?.toLocaleString()} с.`, color: 'text-blue-600' },
                { label: 'Прибыль', value: `+${sale.profit?.toLocaleString()} с.`, color: 'text-emerald-600' },
                { label: 'Тип оплаты', value: sale.is_debt ? 'В долг' : 'Наличные', color: sale.is_debt ? 'text-orange-600' : 'text-emerald-600' },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className={`font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            /* Edit mode */
            <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-medium text-amber-800">
                Редактирование {editCount + 1} из {MAX_EDITS}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Коробок</Label>
                  <Input
                    type="text" inputMode="numeric"
                    value={editData.boxes_sold}
                    onChange={(e) => setEditData({ ...editData, boxes_sold: e.target.value.replace(/\D/g, '') })}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Цена / коробка</Label>
                  <Input
                    type="text" inputMode="decimal"
                    value={editData.sale_price}
                    onChange={(e) => setEditData({ ...editData, sale_price: e.target.value.replace(/[^0-9.]/g, '') })}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-600">Итого: <b>{newTotal.toLocaleString()} с.</b></span>
                <span className="text-emerald-700">Прибыль: <b>+{newProfit.toLocaleString()} с.</b></span>
              </div>
              <div>
                <Label className="text-xs">Причина изменения</Label>
                <Input
                  value={editData.note}
                  onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                  placeholder="Например: клиент вернул 2 коробки"
                  className="mt-1 h-9"
                />
              </div>
            </div>
          )}

          {/* Клиент */}
          {(sale.customer_name || customer) && (
            <div className="p-3 bg-slate-50 rounded-xl text-sm space-y-1">
              <p className="font-medium text-slate-700">Клиент</p>
              <p className="text-slate-900">{customer?.name || sale.customer_name}</p>
              {sale.customer_address && <p className="text-slate-500">{sale.customer_address}</p>}
              {sale.is_debt && sale.partial_payment > 0 && (
                <p className="text-emerald-600">Оплачено: {sale.partial_payment.toLocaleString()} с.</p>
              )}
            </div>
          )}

          {/* Лимит редактирований */}
          {!sale.is_cancelled && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${editsLeft === 0 ? 'bg-red-50 text-red-700' : editsLeft <= 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {editsLeft === 0 ? 'Лимит редактирований исчерпан (5/5)' : `Осталось редактирований: ${editsLeft} из ${MAX_EDITS}`}
            </div>
          )}

          {/* История редактирований */}
          {editHistory.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 text-sm font-medium text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  История изменений ({editHistory.length})
                </span>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showHistory && (
                <div className="divide-y divide-slate-100">
                  {[...editHistory].reverse().map((h, i) => (
                    <div key={i} className="p-3 text-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-slate-700">Изменение #{editHistory.length - i}</span>
                        <span className="text-xs text-slate-400">
                          {format(parseISO(h.edited_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </span>
                      </div>
                      {h.changes && h.changes.length > 0 ? (
                        <div className="space-y-1">
                          {h.changes.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500 w-24 flex-shrink-0">{c.label}:</span>
                              <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">{c.from}</span>
                              <span className="text-slate-400">→</span>
                              <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-semibold">{c.to}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-xs">Было: {h.boxes_sold} кор. × {h.sale_price?.toLocaleString()} с. = {h.total_amount?.toLocaleString()} с.</p>
                      )}
                      {h.note && <p className="text-slate-400 italic text-xs mt-1">"{h.note}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!sale.is_cancelled && mode === 'view' && (
            <>
              <Button
                variant="outline"
                disabled={!canEdit}
                onClick={() => setMode('edit')}
                className="flex-1 gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Редактировать
              </Button>
              {!sale.is_debt && (
                <Button
                  variant="outline"
                  onClick={() => setMode('to_debt')}
                  className="flex-1 gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <CreditCard className="w-4 h-4" />
                  В долг
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setMode('cancel')}
                className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
                Отменить продажу
              </Button>
            </>
          )}

          {mode === 'edit' && (
            <>
              <Button variant="outline" onClick={() => setMode('view')} className="flex-1">Назад</Button>
              <Button onClick={handleEdit} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" />Сохранить</>}
              </Button>
            </>
          )}

          {mode === 'to_debt' && (
            <div className="w-full space-y-3">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Перевести в долг
                </p>
                <p>Продажа на сумму <b>{sale.total_amount?.toLocaleString()} с.</b> будет записана как долг клиента.</p>
              </div>
              <CustomerSearchSelect
                customers={[]}
                value={debtData.customer_id}
                onChange={(v) => setDebtData({ ...debtData, customer_id: v })}
                businessId={sale.business_id}
                onCustomerAdded={() => {}}
              />
              <div>
                <Label className="text-xs">Частичная оплата сейчас (сомони)</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={debtData.partial_payment}
                  onChange={(e) => setDebtData({ ...debtData, partial_payment: e.target.value.replace(/[^0-9.]/g, '') })}
                  placeholder="0"
                  className="mt-1 h-9"
                />
                {debtData.partial_payment > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Остаток долга: {(sale.total_amount - (parseFloat(debtData.partial_payment) || 0)).toLocaleString()} с.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode('view')} className="flex-1">Назад</Button>
                <Button
                  onClick={handleConvertToDebt}
                  disabled={saving || !debtData.customer_id}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" />Сохранить</>}
                </Button>
              </div>
            </div>
          )}

          {mode === 'cancel' && (
            <div className="w-full space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <p className="font-medium mb-1">Подтвердите отмену продажи</p>
                <p>Товар ({sale.boxes_sold} коробок) вернётся на склад. Это действие нельзя отменить.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode('view')} className="flex-1">Назад</Button>
                <Button onClick={handleCancel} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" />Отменить</>}
                </Button>
              </div>
            </div>
          )}

          {mode === 'view' && (
            <Button variant="ghost" onClick={onClose} className="flex-1">Закрыть</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}