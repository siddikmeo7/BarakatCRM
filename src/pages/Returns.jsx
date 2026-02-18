import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
  TrendingDown
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

const CONDITIONS = ['Новый', 'Хорошее', 'Среднее', 'Плохое'];

export default function Returns() {
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
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      
      if (businesses.length > 0) {
        const biz = businesses[0];
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

      // Возвращаем товар на выбранный склад
      const warehouseProducts = products.filter(p => 
        p.warehouse_id === formData.warehouse_id && 
        p.brand === products.find(pr => pr.id === formData.product_id)?.brand &&
        p.model === products.find(pr => pr.id === formData.product_id)?.model
      );
      
      if (warehouseProducts.length > 0) {
        const targetProduct = warehouseProducts[0];
        await base44.entities.Product.update(targetProduct.id, {
          boxes_in_stock: (targetProduct.boxes_in_stock || 0) + parseInt(formData.boxes_returned)
        });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Возвраты"
        subtitle={`${totalReturns} возвратов`}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700 gap-2">
            <Plus className="w-4 h-4" />
            Оформить возврат
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Всего возвратов</p>
          <p className="text-2xl font-bold text-slate-900">{totalReturns}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Коробок возвращено</p>
          <p className="text-2xl font-bold text-orange-600">{totalBoxes}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Сумма возвратов</p>
          <p className="text-2xl font-bold text-red-600">{totalRefund.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {conditionStats.slice(0, 4).map(stat => (
              <div key={stat.condition}>
                <p className="text-slate-500">{stat.condition}</p>
                <p className="font-bold text-slate-900">{stat.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
        <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        <div className="flex flex-wrap items-center gap-4">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Поиск по товару или клиенту..."
            className="w-full sm:w-64"
          />
          <Select value={filterCondition} onValueChange={setFilterCondition}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Состояние" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {CONDITIONS.map(condition => (
                <SelectItem key={condition} value={condition}>{condition}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Товар</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Коробок</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Состояние</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Возврат</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Причина</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map(ret => {
                const customer = customers.find(c => c.id === ret.customer_id);
                const product = products.find(p => p.id === ret.product_id);
                
                return (
                  <tr key={ret.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {format(parseISO(ret.return_date || ret.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{customer?.name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{customer?.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{product?.brand} {product?.model}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-orange-600">
                      {ret.boxes_returned}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        ret.condition === 'Новый' ? 'bg-emerald-100 text-emerald-700' :
                        ret.condition === 'Хорошее' ? 'bg-blue-100 text-blue-700' :
                        ret.condition === 'Среднее' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ret.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {ret.refund_amount?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {ret.reason || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredReturns.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <RotateCcw className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Возвраты не найдены</p>
          </div>
        )}
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
              <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
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
                  }}
                  className="mt-1.5"
                />
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
              disabled={saving || !formData.product_id || !formData.customer_id || !formData.warehouse_id}
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