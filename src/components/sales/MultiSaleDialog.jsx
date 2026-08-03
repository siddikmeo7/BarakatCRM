import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import CustomerSearchSelect from '@/components/search/CustomerSearchSelect';
import { Plus, Trash2, Package, Search, Loader2, ShoppingCart, AlertTriangle } from 'lucide-react';
import { t } from '@/components/i18n/translations';

export default function MultiSaleDialog({ open, onClose, products, customers, business, lang, onSaved }) {
  const [items, setItems] = useState([{ id: Date.now(), product_id: '', boxes_sold: 1, custom_sale_price: '', productSearch: '' }]);
  const [isDebt, setIsDebt] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [partialPayment, setPartialPayment] = useState(0);
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSearch, setActiveSearch] = useState(null); // item id with open dropdown

  const availableProducts = products.filter(p => (p.boxes_in_stock || 0) > 0);

  const getFilteredProducts = (search) =>
    availableProducts.filter(p =>
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.model?.toLowerCase().includes(search.toLowerCase())
    );

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now(), product_id: '', boxes_sold: 1, custom_sale_price: '', productSearch: '' }]);
  };

  const removeItem = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const getProduct = (product_id) => products.find(p => p.id === product_id);

  const calcItem = (item) => {
    const product = getProduct(item.product_id);
    if (!product) return { pairsSold: 0, itemsSold: 0, totalAmount: 0, profit: 0 };
    const boxes = parseInt(item.boxes_sold) || 0;
    const price = item.custom_sale_price ? parseFloat(item.custom_sale_price) : (product.sale_price || 0);
    const pairsSold = boxes * (product.pairs_per_box || 6);
    const itemsSold = pairsSold * 2;
    const totalAmount = boxes * price;
    const profit = boxes * (price - (product.purchase_price || 0));
    return { pairsSold, itemsSold, totalAmount, profit, price };
  };

  const grandTotal = items.reduce((sum, item) => sum + calcItem(item).totalAmount, 0);
  const grandProfit = items.reduce((sum, item) => sum + calcItem(item).profit, 0);
  const remaining = grandTotal - (parseFloat(partialPayment) || 0);

  // Stock validation — aggregate boxes per product across all items
  // so the same product in multiple rows is counted together.
  const stockByProduct = {};
  items.forEach(item => {
    if (!item.product_id) return;
    stockByProduct[item.product_id] = (stockByProduct[item.product_id] || 0) + (parseInt(item.boxes_sold) || 0);
  });

  // Returns available stock for an item's product, accounting for other rows with the same product
  const getAvailableForItem = (item) => {
    const product = getProduct(item.product_id);
    if (!product) return 0;
    const totalInStock = product.boxes_in_stock || 0;
    // Sum boxes of OTHER items with the same product
    const otherItems = items.filter(i => i.product_id === item.product_id && i.id !== item.id);
    const otherBoxes = otherItems.reduce((s, i) => s + (parseInt(i.boxes_sold) || 0), 0);
    return totalInStock - otherBoxes;
  };

  const isItemOverStock = (item) => {
    if (!item.product_id) return false;
    const product = getProduct(item.product_id);
    if (!product) return false;
    const requested = parseInt(item.boxes_sold) || 0;
    return requested > (product.boxes_in_stock || 0);
  };

  const hasStockError = items.some(isItemOverStock);

  const canSave = items.some(i => i.product_id && parseInt(i.boxes_sold) >= 1) && (!isDebt || customerId) && !hasStockError;

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_id && parseInt(i.boxes_sold) >= 1);
    if (validItems.length === 0) return;

    // Final stock validation — block save if any item exceeds available stock
    const overStockItems = validItems.filter(i => {
      const p = getProduct(i.product_id);
      return (parseInt(i.boxes_sold) || 0) > (p?.boxes_in_stock || 0);
    });
    if (overStockItems.length > 0) {
      const p = getProduct(overStockItems[0].product_id);
      alert(`⚠️ Недостаточно товара на складе!\n\nТовар: ${p?.brand || ''} ${p?.model || ''}\nЗапрошено: ${overStockItems[0].boxes_sold} кор.\nВ наличии: ${p?.boxes_in_stock || 0} кор.\n\nПродажа невозможна.`);
      return;
    }

    setSaving(true);
    const partialPay = isDebt ? parseFloat(partialPayment) || 0 : 0;

    try {
      // Check debt limit for customer
      if (isDebt && customerId) {
        const customer = customers.find(c => c.id === customerId);
        const totalDebtAdded = grandTotal - partialPay;
        if (customer?.debt_limit != null) {
          const newTotalDebt = (customer.total_debt || 0) + totalDebtAdded;
          if (newTotalDebt > customer.debt_limit) {
            alert(`⚠️ Превышен лимит долга клиента "${customer.name}"!\nЛимит: ${customer.debt_limit.toLocaleString()} с.\nТекущий долг: ${(customer.total_debt||0).toLocaleString()} с.\nНовый долг составит: ${newTotalDebt.toLocaleString()} с.`);
            setSaving(false);
            return;
          }
        }
      }

      // Distribute partial payment proportionally across items
      const saleDate = new Date().toISOString();
      const createdSales = [];
      const currentUser = await base44.auth.me();

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const product = getProduct(item.product_id);
        const calc = calcItem(item);

        // Distribute partial payment proportionally
        const itemPartial = validItems.length === 1
          ? partialPay
          : i < validItems.length - 1
            ? Math.round((calc.totalAmount / grandTotal) * partialPay)
            : partialPay - createdSales.reduce((s, s2) => s + s2._partial, 0);

        const saleData = {
          business_id: business.id,
          product_id: item.product_id,
          warehouse_id: product?.warehouse_id || '',
          boxes_sold: parseInt(item.boxes_sold),
          pairs_sold: calc.pairsSold,
          items_sold: calc.itemsSold,
          sale_price: calc.price,
          purchase_price: product?.purchase_price || 0,
          total_amount: calc.totalAmount,
          profit: calc.profit,
          sale_date: saleDate,
          is_debt: isDebt,
          customer_id: isDebt ? customerId : '',
          customer_name: customerName || 'Неизвестный',
          customer_address: customerAddress || '',
          partial_payment: itemPartial,
          payment_due_date: isDebt && paymentDueDate ? paymentDueDate : null,
          seller_email: currentUser.email,
          seller_name: window.__barakatEmployee?.name || currentUser.full_name || currentUser.email
        };

        const created = await base44.entities.Sale.create(saleData);
        createdSales.push({ ...created, _partial: itemPartial });

        // Логируем создание продажи
        await base44.entities.ActivityLog.create({
          business_id: business.id,
          action_type: 'create',
          entity_type: 'Sale',
          entity_id: created.id,
          entity_data: saleData,
          user_email: currentUser.email,
          user_name: window.__barakatEmployee?.name || currentUser.full_name || currentUser.email,
          description: `Продажа: ${product?.brand} ${product?.model}, ${saleData.boxes_sold} кор. × ${calc.price?.toLocaleString()} с. = ${calc.totalAmount?.toLocaleString()} с.${isDebt ? ' (в долг)' : ''}`
        });

        // Update product stock
        const newStock = Math.max(0, (product?.boxes_in_stock || 0) - parseInt(item.boxes_sold));
        await base44.entities.Product.update(item.product_id, { boxes_in_stock: newStock });
      }

      // Update customer debt once for total
      if (isDebt && customerId) {
        const customer = customers.find(c => c.id === customerId);
        const totalDebtAdded = grandTotal - partialPay;
        if (customer) {
          await base44.entities.Customer.update(customerId, {
            total_debt: (customer.total_debt || 0) + totalDebtAdded,
            total_paid: (customer.total_paid || 0) + partialPay
          });

          // Partial payment history
          if (partialPay > 0) {
            await base44.entities.DebtPayment.create({
              business_id: business.id,
              customer_id: customerId,
              sale_id: createdSales[0].id,
              amount: partialPay,
              note: 'Частичная оплата при продаже',
              payment_date: saleDate
            });
          }

          // WhatsApp notification — с детализацией по каждому товару
          if (totalDebtAdded > 0 && customer.phone) {
            // Строим массив товаров с суммами оплаты/остатка
            const productsArr = validItems.map((item, idx) => {
              const p = getProduct(item.product_id);
              const calc = calcItem(item);
              const itemPartialPaid = createdSales[idx]?._partial || 0;
              return {
                name: p ? `${p.brand} ${p.model}` : 'Товар',
                boxes: parseInt(item.boxes_sold),
                total: calc.totalAmount,
                paid: itemPartialPaid,
                remaining: calc.totalAmount - itemPartialPaid
              };
            });

            const waRes = await base44.functions.invoke('sendWhatsAppDebtMessage', {
              phone: customer.phone,
              customer_name: customer.name,
              products: productsArr,
              total_debt: grandTotal,
              paid_amount: partialPay,
              remaining_debt: totalDebtAdded,
              business_name: business.name,
              payment_due_date: paymentDueDate || null,
              type: 'new_debt'
            });
            if (waRes.data?.wa_url) window.open(waRes.data.wa_url, '_blank');
          }
        }
      }

      onSaved();
      handleClose();
    } catch (error) {
      console.error('Error saving multi-sale:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setItems([{ id: Date.now(), product_id: '', boxes_sold: 1, custom_sale_price: '', productSearch: '' }]);
    setIsDebt(false);
    setCustomerId('');
    setCustomerName('');
    setCustomerAddress('');
    setPartialPayment(0);
    setPaymentDueDate('');
    setActiveSearch(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            {t(lang, 'sales_new')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Items */}
          <div className="space-y-3">
            {items.map((item, idx) => {
              const product = getProduct(item.product_id);
              const calc = calcItem(item);
              const filtered = getFilteredProducts(item.productSearch);

              return (
                <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Товар {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Product Search */}
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={item.productSearch}
                        onChange={(e) => {
                          updateItem(item.id, 'productSearch', e.target.value);
                          updateItem(item.id, 'product_id', '');
                          setActiveSearch(item.id);
                        }}
                        onFocus={() => setActiveSearch(item.id)}
                        placeholder={t(lang, 'sales_search_placeholder')}
                        className="pl-10"
                      />
                    </div>
                    {activeSearch === item.id && item.productSearch && !item.product_id && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg">
                        {filtered.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={() => {
                              updateItem(item.id, 'product_id', p.id);
                              updateItem(item.id, 'productSearch', `${p.brand} ${p.model}`);
                              setActiveSearch(null);
                            }}
                            className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                          >
                            {p.photo_url ? (
                              <img src={p.photo_url} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                                <Package className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-900">{p.brand} {p.model}</p>
                              <p className="text-xs text-slate-400">
                                {[p.color, p.size_from && p.size_to ? `${p.size_from}–${p.size_to}` : null].filter(Boolean).join(' · ')}
                              </p>
                              <p className="text-xs text-slate-500">{p.boxes_in_stock} кор. • {p.sale_price?.toLocaleString()} с.</p>
                            </div>
                          </div>
                        ))}
                        {filtered.length === 0 && <p className="p-3 text-center text-slate-500 text-sm">Не найдено</p>}
                      </div>
                    )}
                  </div>

                  {product && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t(lang, 'sales_qty_boxes')} *</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.boxes_sold}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            updateItem(item.id, 'boxes_sold', val ? parseInt(val) : '');
                          }}
                          className={`mt-1 h-8 text-sm ${isItemOverStock(item) ? 'border-red-500 animate-pulse-border text-red-600 font-bold' : ''}`}
                        />
                        <p className={`text-xs mt-0.5 ${isItemOverStock(item) ? 'text-red-600 font-semibold animate-pulse' : 'text-slate-400'}`}>
                          {isItemOverStock(item)
                            ? `⚠️ Нет ${item.boxes_sold} кор. — есть только ${product.boxes_in_stock} кор.`
                            : `Есть: ${product.boxes_in_stock} кор.`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">{t(lang, 'sales_price_per_box')}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={item.custom_sale_price}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            updateItem(item.id, 'custom_sale_price', val);
                          }}
                          placeholder={product.sale_price?.toString()}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {product && (
                    <div className="flex gap-4 text-xs text-slate-600 bg-white rounded-lg p-2 border border-slate-100">
                      <span>Пар: <b>{calc.pairsSold}</b></span>
                      <span>Сумма: <b className="text-slate-900">{calc.totalAmount.toLocaleString()} с.</b></span>
                      <span>Прибыль: <b className="text-emerald-600">+{calc.profit.toLocaleString()} с.</b></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Item Button */}
          <Button variant="outline" onClick={addItem} className="w-full gap-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50">
            <Plus className="w-4 h-4" />
            Добавить ещё товар
          </Button>

          {/* Grand Total */}
          {items.some(i => i.product_id) && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50 rounded-xl">
              <div>
                <p className="text-xs text-slate-500">Итого сумма</p>
                <p className="text-lg font-bold text-slate-900">{grandTotal.toLocaleString()} с.</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Итого прибыль</p>
                <p className="text-lg font-bold text-emerald-600">+{grandProfit.toLocaleString()} с.</p>
              </div>
            </div>
          )}

          {/* Debt toggle */}
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
            <Checkbox id="is_debt_multi" checked={isDebt} onCheckedChange={setIsDebt} />
            <label htmlFor="is_debt_multi" className="font-medium text-slate-900 cursor-pointer text-sm">
              {t(lang, 'sales_debt_sale')}
            </label>
          </div>

          {/* Customer */}
          <div className="space-y-3">
            <div>
              <Label>{t(lang, 'sales_customer_name')}</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t(lang, 'sales_not_specified')}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t(lang, 'sales_customer_address')}</Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder={t(lang, 'sales_not_specified')}
                className="mt-1.5"
              />
            </div>
          </div>

          {isDebt && (
            <>
              <CustomerSearchSelect
                customers={customers}
                value={customerId}
                onChange={setCustomerId}
                businessId={business.id}
                onCustomerAdded={() => {}}
              />
              {customerId && (
                <>
                  <div>
                    <Label>{t(lang, 'sales_partial_pay')}</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={partialPayment}
                      onChange={(e) => setPartialPayment(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {t(lang, 'sales_remaining_debt')}: {remaining.toLocaleString()} с.
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">📅 Срок оплаты (необязательно)</Label>
                    <Input
                      type="date"
                      value={paymentDueDate}
                      onChange={(e) => setPaymentDueDate(e.target.value)}
                      className="mt-1.5"
                    />
                    {paymentDueDate && (
                      <p className="text-xs text-orange-500 mt-1">Клиент будет выделен в разделе долгов в этот день</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {hasStockError && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700 font-semibold flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Невозможно продать: запрошено больше коробок, чем есть на складе!</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>{t(lang, 'cancel')}</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t(lang, 'sales_sell_btn')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}