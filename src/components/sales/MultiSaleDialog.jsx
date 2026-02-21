import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import CustomerSearchSelect from '@/components/search/CustomerSearchSelect';
import { Plus, Trash2, Search, Package, ShoppingCart, Loader2 } from 'lucide-react';

export default function MultiSaleDialog({ open, onOpenChange, products, customers, business, lang, onSaved, loadData }) {
  const [cartItems, setCartItems] = useState([{ id: Date.now(), product_id: '', boxes_sold: 1, custom_sale_price: '', productSearch: '', showDropdown: false }]);
  const [isDebt, setIsDebt] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [partialPayment, setPartialPayment] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredProducts = (search) => products.filter(p =>
    (p.brand?.toLowerCase().includes(search.toLowerCase()) ||
     p.model?.toLowerCase().includes(search.toLowerCase())) &&
    (p.boxes_in_stock || 0) > 0
  );

  const updateItem = (id, field, value) => {
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setCartItems(prev => [...prev, { id: Date.now(), product_id: '', boxes_sold: 1, custom_sale_price: '', productSearch: '', showDropdown: false }]);
  };

  const removeItem = (id) => {
    if (cartItems.length === 1) return;
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const getProduct = (productId) => products.find(p => p.id === productId);

  const calcItem = (item) => {
    const product = getProduct(item.product_id);
    if (!product) return { pairsSold: 0, itemsSold: 0, salePrice: 0, total: 0, profit: 0 };
    const pairsSold = (item.boxes_sold || 0) * (product.pairs_per_box || 6);
    const itemsSold = pairsSold * 2;
    const salePrice = item.custom_sale_price ? parseFloat(item.custom_sale_price) : (product.sale_price || 0);
    const total = (item.boxes_sold || 0) * salePrice;
    const profit = (item.boxes_sold || 0) * (salePrice - (product.purchase_price || 0));
    return { pairsSold, itemsSold, salePrice, total, profit };
  };

  const grandTotal = cartItems.reduce((sum, item) => sum + calcItem(item).total, 0);
  const grandProfit = cartItems.reduce((sum, item) => sum + calcItem(item).profit, 0);
  const partialPay = isDebt ? (parseFloat(partialPayment) || 0) : 0;
  const remainingDebt = grandTotal - partialPay;

  const validItems = cartItems.filter(item => item.product_id && (item.boxes_sold || 0) >= 1);
  const canSave = validItems.length > 0 && (!isDebt || customerId);

  const handleClose = () => {
    setCartItems([{ id: Date.now(), product_id: '', boxes_sold: 1, custom_sale_price: '', productSearch: '', showDropdown: false }]);
    setIsDebt(false);
    setCustomerId('');
    setCustomerName('');
    setCustomerAddress('');
    setPartialPayment('');
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const customer = customers.find(c => c.id === customerId);

    // Проверка лимита долга
    if (isDebt && customer && customer.debt_limit != null) {
      const newTotalDebt = (customer.total_debt || 0) + remainingDebt;
      if (newTotalDebt > customer.debt_limit) {
        setSaving(false);
        alert(`⚠️ Превышен лимит долга клиента "${customer.name}"!\nЛимит: ${customer.debt_limit.toLocaleString()} с.\nТекущий долг: ${(customer.total_debt||0).toLocaleString()} с.\nНовый долг составит: ${newTotalDebt.toLocaleString()} с.`);
        return;
      }
    }

    try {
      const saleDate = new Date().toISOString();

      for (const item of validItems) {
        const product = getProduct(item.product_id);
        const { pairsSold, itemsSold, salePrice, total, profit } = calcItem(item);

        // Рассчитываем частичную оплату пропорционально
        const itemRatio = grandTotal > 0 ? total / grandTotal : 1;
        const itemPartialPay = isDebt ? Math.round(partialPay * itemRatio) : 0;
        const itemRemainingDebt = isDebt ? total - itemPartialPay : 0;

        const createdSale = await business && (await (async () => {
          const s = await import('@/api/base44Client').then(m => m.base44.entities.Sale.create({
            business_id: business.id,
            product_id: item.product_id,
            warehouse_id: product?.warehouse_id || '',
            boxes_sold: parseInt(item.boxes_sold),
            pairs_sold: pairsSold,
            items_sold: itemsSold,
            sale_price: salePrice,
            purchase_price: product?.purchase_price || 0,
            total_amount: total,
            profit: profit,
            sale_date: saleDate,
            is_debt: isDebt,
            customer_id: isDebt ? customerId : '',
            customer_name: customerName || customer?.name || 'Неизвестный',
            customer_address: customerAddress || '',
            partial_payment: itemPartialPay
          }));
          return s;
        })());

        // Обновляем склад
        const newStock = Math.max(0, (product.boxes_in_stock || 0) - parseInt(item.boxes_sold));
        await import('@/api/base44Client').then(m => m.base44.entities.Product.update(item.product_id, { boxes_in_stock: newStock }));

        // Частичная оплата
        if (isDebt && customerId && itemPartialPay > 0 && createdSale) {
          await import('@/api/base44Client').then(m => m.base44.entities.DebtPayment.create({
            business_id: business.id,
            customer_id: customerId,
            sale_id: createdSale.id,
            amount: itemPartialPay,
            note: 'Частичная оплата при продаже',
            payment_date: saleDate
          }));
        }
      }

      // Обновляем долг клиента
      if (isDebt && customerId && customer) {
        await import('@/api/base44Client').then(m => m.base44.entities.Customer.update(customerId, {
          total_debt: (customer.total_debt || 0) + remainingDebt,
          total_paid: (customer.total_paid || 0) + partialPay
        }));
      }

      await loadData();
      handleClose();
    } catch (error) {
      console.error('Error saving multi-sale:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            Продажа нескольких товаров
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cart Items */}
          {cartItems.map((item, idx) => {
            const product = getProduct(item.product_id);
            const { pairsSold, total, profit } = calcItem(item);
            const filtered = filteredProducts(item.productSearch);

            return (
              <div key={item.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Товар {idx + 1}</span>
                  {cartItems.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="p-1 text-red-400 hover:text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Product search */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={item.productSearch}
                      onChange={(e) => {
                        updateItem(item.id, 'productSearch', e.target.value);
                        updateItem(item.id, 'showDropdown', true);
                        if (!e.target.value) updateItem(item.id, 'product_id', '');
                      }}
                      placeholder="Поиск товара..."
                      className="pl-10"
                    />
                  </div>
                  {item.showDropdown && item.productSearch && (
                    <div className="absolute z-50 w-full mt-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg">
                      {filtered.map(p => (
                        <div key={p.id} onClick={() => {
                          updateItem(item.id, 'product_id', p.id);
                          updateItem(item.id, 'productSearch', `${p.brand} ${p.model}`);
                          updateItem(item.id, 'showDropdown', false);
                        }} className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{p.brand} {p.model}</p>
                            <p className="text-xs text-slate-500">{p.boxes_in_stock} кор. • {p.sale_price?.toLocaleString()} с.</p>
                          </div>
                        </div>
                      ))}
                      {filtered.length === 0 && <p className="p-3 text-center text-slate-500 text-sm">Не найдено</p>}
                    </div>
                  )}
                </div>

                {/* Qty and price */}
                {product && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Кол-во коробок</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.boxes_sold}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            updateItem(item.id, 'boxes_sold', val ? parseInt(val) : '');
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Цена за коробку</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={item.custom_sale_price}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            updateItem(item.id, 'custom_sale_price', val);
                          }}
                          placeholder={`${product.sale_price}`}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 bg-white rounded-lg text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Пар</p>
                        <p className="font-semibold text-slate-900">{pairsSold}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Сумма</p>
                        <p className="font-semibold text-slate-900">{total.toLocaleString()} с.</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Прибыль</p>
                        <p className="font-semibold text-emerald-600">+{profit.toLocaleString()} с.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Add item button */}
          <button onClick={addItem} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
            <Plus className="w-4 h-4" />
            Добавить ещё товар
          </button>

          {/* Grand total */}
          {validItems.length > 0 && (
            <div className="p-4 bg-indigo-50 rounded-xl grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-slate-500">Итого сумма</p>
                <p className="text-xl font-bold text-slate-900">{grandTotal.toLocaleString()} с.</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Итого прибыль</p>
                <p className="text-xl font-bold text-emerald-600">+{grandProfit.toLocaleString()} с.</p>
              </div>
            </div>
          )}

          {/* Debt toggle */}
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl">
            <Checkbox id="multi_is_debt" checked={isDebt} onCheckedChange={setIsDebt} />
            <label htmlFor="multi_is_debt" className="font-medium text-slate-900 cursor-pointer">
              Продажа в долг
            </label>
          </div>

          {/* Customer */}
          <div className="space-y-3">
            <div>
              <Label>Имя клиента</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Не указан" className="mt-1.5" />
            </div>
            <div>
              <Label>Адрес клиента</Label>
              <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Не указан" className="mt-1.5" />
            </div>
          </div>

          {isDebt && (
            <>
              <CustomerSearchSelect
                customers={customers}
                value={customerId}
                onChange={setCustomerId}
                businessId={business?.id}
                onCustomerAdded={loadData}
              />
              {customerId && (
                <div>
                  <Label>Частичная оплата</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={partialPayment}
                    onChange={(e) => setPartialPayment(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Остаток долга: {remainingDebt.toLocaleString()} с.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving || !canSave} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Продать (${validItems.length} тов.)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}