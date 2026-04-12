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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      let biz = null;
      const savedMode = sessionStorage.getItem('barakatcrm_mode');
      if (savedMode && savedMode.startsWith('employee_')) {
        const empId = savedMode.replace('employee_', '');
        const empRecords = await base44.entities.Employee.filter({ user_email: user.email, is_active: true });
        const emp = empRecords.find(e => e.id === empId) || empRecords[0];
        if (emp && !emp.is_frozen) {
          const bizList = await base44.entities.Business.filter({ id: emp.business_id });
          if (bizList.length > 0) biz = bizList[0];
        }
      }
      if (!biz) {
        const businesses = await base44.entities.Business.filter({ owner_email: user.email });
        if (businesses.length > 0) biz = businesses[0];
      }
      
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

      // Если у продажи был долг — корректируем долг клиента на сумму возврата
      if (formData.sale_id && formData.customer_id) {
        const sale = sales.find(s => s.id === formData.sale_id);
        if (sale?.is_debt && sale.customer_id === formData.customer_id) {
          const customer = customers.find(c => c.id === formData.customer_id);
          if (customer) {
            const refundAmt = parseFloat(formData.refund_amount) || 0;
            // Уменьшаем долг клиента на сумму возврата
            await base44.entities.Customer.update(customer.id, {
              total_debt: Math.max(0, (customer.total_debt || 0) - refundAmt)
            });
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

  if (!can('manage_returns')) {
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Оформить возврат</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Клиент *</Label>
              <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Товар *</Label>
              <Select value={formData.product_id} onValueChange={(v) => { setFormData({ ...formData, product_id: v, sale_id: '', boxes_returned: 1 }); setReturnWarning(''); }}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Выберите товар" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.brand} {product.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Оригинальная продажа — для валидации */}
            {formData.customer_id && formData.product_id && (
              <div>
                <Label>Привязать к продаже (необязательно)</Label>
                <Select value={formData.sale_id} onValueChange={(v) => {
                  setFormData({ ...formData, sale_id: v });
                  setReturnWarning('');
                }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Выберите продажу" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales.filter(s => s.customer_id === formData.customer_id && s.product_id === formData.product_id && !s.is_cancelled).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {new Date(s.sale_date || s.created_date).toLocaleDateString('ru')} — {s.boxes_sold} кор. × {s.sale_price} с.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.sale_id && (
                  <p className="text-xs text-slate-500 mt-1">
                    Продано: {sales.find(s => s.id === formData.sale_id)?.boxes_sold} коробок
                  </p>
                )}
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
                    // Проверка: не больше чем было продано
                    if (formData.sale_id) {
                      const sale = sales.find(s => s.id === formData.sale_id);
                      if (sale && parseInt(val) > sale.boxes_sold) {
                        setReturnWarning(`⚠️ Нельзя вернуть больше чем было продано (${sale.boxes_sold} коробок)`);
                      } else {
                        setReturnWarning('');
                      }
                    }
                  }}
                  className={`mt-1.5 ${returnWarning ? 'border-red-400' : ''}`}
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

          <div className="flex justify-end gap-3">
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