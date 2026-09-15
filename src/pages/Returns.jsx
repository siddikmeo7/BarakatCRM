import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import DateFilter from '@/components/filters/DateFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  RotateCcw, 
  Package,
  Plus,
  Loader2,
  TrendingDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

const CONDITIONS = ['Новый', 'Хорошее', 'Среднее', 'Плохое'];

export default function Returns() {
  const { can } = useEmployeeAccess();

  const [business, setBusiness] = useState(null);
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [expandedReturn, setExpandedReturn] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    warehouse_id: '',
    sale_id: '',
    boxes_returned: 1,
    condition: 'Хорошее',
    refund_amount: '',
    reason: ''
  });
  const [returnWarning, setReturnWarning] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearchReturn, setProductSearchReturn] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showProductList, setShowProductList] = useState(false);

  useEffect(() => {
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.return-search-dropdown')) {
        setShowCustomerList(false);
        setShowProductList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }
      
      if (biz) {
        setBusiness(biz);
        
        const [returnsData, productsData, customersData, salesData, warehousesData] = await Promise.all([
          base44.entities.Return.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Warehouse.filter({ business_id: biz.id })
        ]);
        
        setReturns(returnsData.sort((a, b) => new Date(b.return_date || b.created_date) - new Date(a.return_date || a.created_date)));
        setProducts(productsData);
        setCustomers(customersData);
        setSales(salesData);
        setWarehouses(warehousesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const returnData = {
        business_id: business.id,
        customer_id: formData.customer_id,
        product_id: formData.product_id,
        warehouse_id: formData.warehouse_id,
        sale_id: formData.sale_id,
        boxes_returned: parseInt(formData.boxes_returned),
        condition: formData.condition,
        refund_amount: parseFloat(formData.refund_amount) || 0,
        reason: formData.reason,
        return_date: new Date().toISOString()
      };

      await base44.entities.Return.create(returnData);

      // Возвращаем товар на склад — приоритет: тот же product_id
      const returnedProduct = products.find(p => p.id === formData.product_id);
      if (returnedProduct) {
        await base44.entities.Product.update(returnedProduct.id, {
          boxes_in_stock: (returnedProduct.boxes_in_stock || 0) + parseInt(formData.boxes_returned)
        });
      }

      // Если возврат привязан к продаже — аннулируем продажу
      // (выручка и прибыль исчезнут из аналитики, т.к. она фильтрует is_cancelled)
      if (formData.sale_id) {
        const sale = sales.find(s => s.id === formData.sale_id);
        if (sale) {
          const isFullReturn = parseInt(formData.boxes_returned) >= (sale.boxes_sold || 0);

          // Полный возврат → помечаем продажу отменённой → прибыль/выручка исчезают из аналитики
          if (isFullReturn) {
            await base44.entities.Sale.update(sale.id, {
              is_cancelled: true,
              cancelled_at: new Date().toISOString()
            });
          }

          // Для долговой продажи — списываем долг клиента (он не платил, просто вернул товар)
          if (sale.is_debt && sale.customer_id === formData.customer_id) {
            const customer = customers.find(c => c.id === formData.customer_id);
            if (customer) {
              const saleDebt = (sale.total_amount || 0) - (sale.partial_payment || 0);
              const updates = {
                total_debt: Math.max(0, (customer.total_debt || 0) - saleDebt),
                purchase_count: Math.max(0, (customer.purchase_count || 0) - 1)
              };
              // Если была частичная оплата — возвращаем её
              if ((sale.partial_payment || 0) > 0) {
                updates.total_paid = Math.max(0, (customer.total_paid || 0) - (sale.partial_payment || 0));
              }
              await base44.entities.Customer.update(customer.id, updates);
            }
          }
        }
      }

      await loadData();
      setDialogOpen(false);
      setFormData({
        customer_id: '',
        product_id: '',
        warehouse_id: '',
        sale_id: '',
        boxes_returned: 1,
        condition: 'Хорошее',
        refund_amount: '',
        reason: ''
      });
    } catch (error) {
      console.error('Error saving return:', error);
    } finally {
      setSaving(false);
    }
  };

  // Фильтрация
  const filteredReturns = returns.filter(ret => {
    const product = products.find(p => p.id === ret.product_id);
    const customer = customers.find(c => c.id === ret.customer_id);
    const matchesSearch = 
      product?.brand?.toLowerCase().includes(search.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCondition = filterCondition === 'all' || ret.condition === filterCondition;
    
    let matchesDate = true;
    if (dateRange?.from) {
      const returnDate = parseISO(ret.return_date || ret.created_date);
      matchesDate = isWithinInterval(returnDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
    }
    
    return matchesSearch && matchesCondition && matchesDate;
  });

  // Статистика
  const totalReturns = filteredReturns.length;
  const totalRefund = filteredReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
  const totalBoxes = filteredReturns.reduce((sum, r) => sum + (r.boxes_returned || 0), 0);

  const conditionStats = CONDITIONS.map(condition => ({
    condition,
    count: filteredReturns.filter(r => r.condition === condition).length
  }));

  if (!can('view_returns') && !can('manage_returns')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <RotateCcw className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Нет доступа</h3>
            <p className="text-slate-600">У вас нет прав для просмотра возвратов.<br/>Обратитесь к владельцу бизнеса.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Возвраты</h1>
          <p className="text-xs text-slate-400">{totalReturns} · {totalRefund.toLocaleString()} с.</p>
        </div>
        {can('manage_returns') && (
          <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-orange-600 hover:bg-orange-700 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Оформить
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 text-center">
          <p className="text-xs text-slate-400">Возвратов</p>
          <p className="text-lg font-bold text-slate-900">{totalReturns}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 text-center">
          <p className="text-xs text-slate-400">Коробок</p>
          <p className="text-lg font-bold text-orange-600">{totalBoxes}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 text-center">
          <p className="text-xs text-slate-400">Сумма</p>
          <p className="text-lg font-bold text-red-600">{totalRefund.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." className="flex-1 min-w-32" />
        <Select value={filterCondition} onValueChange={setFilterCondition}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Состояние" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* Returns Cards */}
      <div className="space-y-3">
        {filteredReturns.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
            <RotateCcw className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Возвраты не найдены</p>
          </div>
        ) : filteredReturns.map(ret => {
          const customer = customers.find(c => c.id === ret.customer_id);
          const product = products.find(p => p.id === ret.product_id);
          const isExpanded = expandedReturn === ret.id;

          return (
            <div key={ret.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Краткая строка */}
              <button
                onClick={() => setExpandedReturn(isExpanded ? null : ret.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {product?.brand} {product?.model}
                  </p>
                  <p className="text-xs text-slate-400">
                    {customer?.name || 'N/A'} · {format(parseISO(ret.return_date || ret.created_date), 'dd MMM yyyy', { locale: ru })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 mr-2">
                  <p className="font-bold text-red-600 text-sm">{ret.refund_amount?.toLocaleString()} с.</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ret.condition === 'Новый' ? 'bg-emerald-100 text-emerald-700' :
                    ret.condition === 'Хорошее' ? 'bg-blue-100 text-blue-700' :
                    ret.condition === 'Среднее' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{ret.condition}</span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>

              {/* Детали */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Клиент</p>
                      <p className="font-medium text-slate-800">{customer?.name || '—'}</p>
                      {customer?.phone && <p className="text-xs text-slate-400">{customer.phone}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Дата и время</p>
                      <p className="font-medium text-slate-800">
                        {format(parseISO(ret.return_date || ret.created_date), 'dd MMM yyyy', { locale: ru })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(parseISO(ret.return_date || ret.created_date), 'HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Коробок возвращено</p>
                      <p className="font-bold text-orange-600">{ret.boxes_returned} кор.</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Сумма возврата</p>
                      <p className="font-bold text-red-600">{ret.refund_amount?.toLocaleString()} с.</p>
                    </div>
                  </div>
                  {ret.reason && (
                    <div>
                      <p className="text-xs text-slate-400">Причина</p>
                      <p className="text-sm text-slate-700">{ret.reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Return Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0 border-b border-slate-100">
            <DialogTitle>Оформить возврат</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Клиент с поиском */}
            <div>
              <Label>Клиент *</Label>
              <div className="relative mt-1.5 return-search-dropdown">
                <input
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Поиск клиента по имени, телефону..."
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)}
                />
                {formData.customer_id && (
                  <div className="mt-1 px-2 py-1 bg-indigo-50 rounded-lg text-xs text-indigo-700 font-medium flex items-center justify-between">
                    <span>✓ {customers.find(c => c.id === formData.customer_id)?.name}</span>
                    <button onClick={() => { setFormData({ ...formData, customer_id: '' }); setCustomerSearch(''); }} className="text-indigo-400 hover:text-red-500">✕</button>
                  </div>
                )}
                {showCustomerList && customerSearch && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {customers
                      .filter(c => {
                        const q = customerSearch.toLowerCase();
                        return c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
                      })
                      .map(c => (
                        <div key={c.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                          onMouseDown={() => { setFormData({ ...formData, customer_id: c.id }); setCustomerSearch(c.name); setShowCustomerList(false); }}>
                          <p className="font-medium text-slate-900">{c.name}</p>
                          {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                        </div>
                      ))
                    }
                    {customers.filter(c => { const q = customerSearch.toLowerCase(); return c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q); }).length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-400">Клиент не найден</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Товар с поиском */}
            <div>
              <Label>Товар *</Label>
              <div className="relative mt-1.5 return-search-dropdown">
                <input
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Поиск товара по бренду, модели, типу..."
                  value={productSearchReturn}
                  onChange={e => { setProductSearchReturn(e.target.value); setShowProductList(true); }}
                  onFocus={() => setShowProductList(true)}
                />
                {formData.product_id && (
                  <div className="mt-1 px-2 py-1 bg-indigo-50 rounded-lg text-xs text-indigo-700 font-medium flex items-center justify-between">
                    <span>✓ {(() => { const p = products.find(x => x.id === formData.product_id); return p ? `${p.brand} ${p.model}` : ''; })()}</span>
                    <button onClick={() => { setFormData({ ...formData, product_id: '', sale_id: '', boxes_returned: 1 }); setProductSearchReturn(''); setReturnWarning(''); }} className="text-indigo-400 hover:text-red-500">✕</button>
                  </div>
                )}
                {showProductList && productSearchReturn && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {products
                      .filter(p => {
                        const q = productSearchReturn.toLowerCase();
                        const full = `${p.brand || ''} ${p.model || ''}`.toLowerCase();
                        return full.includes(q) || p.brand?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q) || p.product_type?.toLowerCase().includes(q) || p.color?.toLowerCase().includes(q);
                      })
                      .map(p => (
                        <div key={p.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                          onMouseDown={() => { setFormData({ ...formData, product_id: p.id, sale_id: '', boxes_returned: 1 }); setProductSearchReturn(`${p.brand} ${p.model}`); setShowProductList(false); setReturnWarning(''); }}>
                          <p className="font-medium text-slate-900">{p.brand} {p.model}</p>
                          <p className="text-xs text-slate-400">{[p.product_type, p.color, p.boxes_in_stock !== undefined ? `${p.boxes_in_stock} кор.` : null].filter(Boolean).join(' · ')}</p>
                        </div>
                      ))
                    }
                    {products.filter(p => { const q = productSearchReturn.toLowerCase(); const full = `${p.brand || ''} ${p.model || ''}`.toLowerCase(); return full.includes(q) || p.brand?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q) || p.product_type?.toLowerCase().includes(q) || p.color?.toLowerCase().includes(q); }).length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-400">Товар не найден</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* История покупок клиента — выбор товара для возврата */}
            {formData.customer_id && (
              <div>
                <Label>Покупки клиента — выберите товар для возврата</Label>
                <div className="mt-1.5 border border-slate-200 rounded-xl p-1.5 max-h-60 overflow-y-auto space-y-1">
                  {(() => {
                    const custSales = sales
                      .filter(s => s.customer_id === formData.customer_id && !s.is_cancelled)
                      .sort((a,b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date));
                    if (custSales.length === 0) {
                      return <p className="px-2 py-3 text-sm text-slate-400 text-center">У этого клиента нет покупок</p>;
                    }
                    return custSales.map(s => {
                      const p = products.find(x => x.id === s.product_id);
                      const isSelected = formData.sale_id === s.id;
                      return (
                        <div key={s.id}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              product_id: s.product_id,
                              sale_id: s.id,
                              warehouse_id: s.warehouse_id || formData.warehouse_id,
                              boxes_returned: s.boxes_sold,
                              refund_amount: String(s.total_amount || 0)
                            });
                            setProductSearchReturn(p ? `${p.brand} ${p.model}` : '');
                            setReturnWarning('');
                          }}
                          className={`p-2 rounded-lg cursor-pointer text-sm flex items-center gap-3 transition-colors ${isSelected ? 'bg-indigo-100 border border-indigo-300' : 'hover:bg-slate-50 border border-transparent'}`}>
                          <ProductPhoto
                            photoUrl={p?.photo_url}
                            brand={p?.brand}
                            className="w-9 h-9 rounded-lg flex-shrink-0"
                            textClassName="text-[8px]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{p?.brand} {p?.model}</p>
                            <p className="text-xs text-slate-400">
                              {format(parseISO(s.sale_date || s.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })} · {s.boxes_sold} кор. · {s.is_debt ? 'В долг' : 'Наличные'}
                            </p>
                            {(() => { const wh = warehouses.find(w => w.id === s.warehouse_id); return wh ? <p className="text-xs text-slate-400">📍 {wh.name}</p> : null; })()}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-slate-900 text-sm">{s.total_amount?.toLocaleString()} с.</p>
                            {isSelected && <p className="text-[10px] text-indigo-600 font-medium">✓ выбрано</p>}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            <div>
              <Label>Склад возврата *</Label>
              <Select value={formData.warehouse_id} onValueChange={(v) => setFormData({ ...formData, warehouse_id: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Выберите склад" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Коробок возвращено *</Label>
                <Input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  min="1"
                  value={formData.boxes_returned}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, boxes_returned: val });
                    // Проверка: нельзя вернуть больше, чем клиент покупал
                    if (formData.sale_id) {
                      const sale = sales.find(s => s.id === formData.sale_id);
                      if (sale && parseInt(val) > sale.boxes_sold) {
                        setReturnWarning(`Клиент покупал ${sale.boxes_sold} кор. — нельзя вернуть больше`);
                      } else {
                        setReturnWarning('');
                      }
                    }
                  }}
                  className={`mt-1.5 ${returnWarning ? 'border-red-500 animate-pulse-border text-red-600 font-bold' : ''}`}
                />
                {returnWarning && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{returnWarning}</p>
                )}
              </div>
              <div>
                <Label>Состояние *</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(condition => (
                      <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Сумма возврата *</Label>
              <Input
                type="text"
                pattern="[0-9.]*"
                inputMode="decimal"
                value={formData.refund_amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setFormData({ ...formData, refund_amount: val });
                }}
                placeholder="0"
                className="mt-1.5"
              />
              {formData.sale_id && (() => {
                const sale = sales.find(s => s.id === formData.sale_id);
                if (!sale) return null;
                return (
                  <p className="text-xs text-slate-500 mt-1">
                    Клиент покупал за: <span className="font-semibold text-slate-700">{(sale.total_amount || 0).toLocaleString()} с.</span>
                    <span className="text-slate-400"> ({sale.is_debt ? 'в долг' : 'наличные'})</span>
                  </p>
                );
              })()}
            </div>

            <div>
              <Label>Причина возврата</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Опишите причину..."
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.product_id || !formData.customer_id || !formData.warehouse_id || !!returnWarning}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Оформить возврат'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}