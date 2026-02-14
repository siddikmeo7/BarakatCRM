import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import DateFilter from '@/components/filters/DateFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import CustomerSearchSelect from '@/components/search/CustomerSearchSelect';
import { 
  Plus, 
  ShoppingCart, 
  Package,
  Box,
  Layers,
  Hash,
  TrendingUp,
  Loader2,
  Search
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Sales() {
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [displayUnit, setDisplayUnit] = useState('boxes'); // boxes, pairs, items
  
  const [formData, setFormData] = useState({
    product_id: '',
    boxes_sold: 1,
    custom_sale_price: '',
    is_debt: false,
    customer_id: ''
  });
  const [productSearch, setProductSearch] = useState('');

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
        
        const [salesData, productsData, warehousesData, customersData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Warehouse.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id })
        ]);
        
        setSales(salesData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setProducts(productsData);
        setWarehouses(warehousesData);
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);
  
  // Расчёты для выбранного товара
  const pairsSold = formData.boxes_sold * (selectedProduct?.pairs_per_box || 6);
  const itemsSold = pairsSold * 2;
  const actualSalePrice = formData.custom_sale_price ? parseFloat(formData.custom_sale_price) : (selectedProduct?.sale_price || 0);
  const totalAmount = formData.boxes_sold * actualSalePrice;
  const profit = formData.boxes_sold * (actualSalePrice - (selectedProduct?.purchase_price || 0));

  const handleSave = async () => {
    if (!formData.product_id || formData.boxes_sold < 1) return;
    
    setSaving(true);
    try {
      const saleData = {
        business_id: business.id,
        product_id: formData.product_id,
        warehouse_id: selectedProduct?.warehouse_id || '',
        boxes_sold: parseInt(formData.boxes_sold),
        pairs_sold: pairsSold,
        items_sold: itemsSold,
        sale_price: actualSalePrice,
        purchase_price: selectedProduct?.purchase_price || 0,
        total_amount: totalAmount,
        profit: profit,
        sale_date: new Date().toISOString(),
        is_debt: formData.is_debt,
        customer_id: formData.is_debt ? formData.customer_id : ''
      };

      await base44.entities.Sale.create(saleData);

      // Обновляем остаток товара
      const newStock = Math.max(0, (selectedProduct.boxes_in_stock || 0) - parseInt(formData.boxes_sold));
      await base44.entities.Product.update(formData.product_id, { boxes_in_stock: newStock });

      // Если продажа в долг, обновляем долг клиента
      if (formData.is_debt && formData.customer_id) {
        const customer = customers.find(c => c.id === formData.customer_id);
        if (customer) {
          await base44.entities.Customer.update(formData.customer_id, {
            total_debt: (customer.total_debt || 0) + totalAmount
          });
        }
      }
      
      await loadData();
      setDialogOpen(false);
      setFormData({ product_id: '', boxes_sold: 1, custom_sale_price: '', is_debt: false, customer_id: '' });
      setProductSearch('');
    } catch (error) {
      console.error('Error saving sale:', error);
    } finally {
      setSaving(false);
    }
  };

  // Фильтрация продаж
  const filteredSales = sales.filter(sale => {
    const product = products.find(p => p.id === sale.product_id);
    const matchesSearch = 
      product?.brand?.toLowerCase().includes(search.toLowerCase()) ||
      product?.model?.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse = filterWarehouse === 'all' || sale.warehouse_id === filterWarehouse;
    
    let matchesDate = true;
    if (dateRange?.from) {
      const saleDate = parseISO(sale.sale_date || sale.created_date);
      matchesDate = isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
    }
    
    return matchesSearch && matchesWarehouse && matchesDate;
  });

  // Итоги
  const totals = filteredSales.reduce((acc, sale) => ({
    boxes: acc.boxes + (sale.boxes_sold || 0),
    pairs: acc.pairs + (sale.pairs_sold || 0),
    items: acc.items + (sale.items_sold || 0),
    revenue: acc.revenue + (sale.total_amount || 0),
    profit: acc.profit + (sale.profit || 0)
  }), { boxes: 0, pairs: 0, items: 0, revenue: 0, profit: 0 });

  // Поиск товаров для выбора
  const filteredProducts = products.filter(p => 
    (p.brand?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.model?.toLowerCase().includes(productSearch.toLowerCase())) &&
    (p.boxes_in_stock || 0) > 0
  );

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
        title="Продажи"
        subtitle={`${filteredSales.length} продаж`}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Новая продажа
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-slate-500">Коробок</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.boxes}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-slate-500">Пар</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.pairs}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-slate-500">Штук</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.items}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-500">Выручка</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-500">Прибыль</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totals.profit.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
        <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        <div className="flex flex-wrap items-center gap-4">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Поиск по товару..."
            className="w-full sm:w-64"
          />
          <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Склад" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все склады</SelectItem>
              {warehouses.map(wh => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={displayUnit} onValueChange={setDisplayUnit}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boxes">Коробки</SelectItem>
              <SelectItem value="pairs">Пары</SelectItem>
              <SelectItem value="items">Штуки</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Товар</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">
                  {displayUnit === 'boxes' ? 'Коробок' : displayUnit === 'pairs' ? 'Пар' : 'Штук'}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Сумма</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Прибыль</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Тип</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map(sale => {
                const product = products.find(p => p.id === sale.product_id);
                const customer = customers.find(c => c.id === sale.customer_id);
                const displayQty = displayUnit === 'boxes' ? sale.boxes_sold : 
                                  displayUnit === 'pairs' ? sale.pairs_sold : sale.items_sold;
                
                return (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product?.photo_url ? (
                          <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{product?.brand || 'Удалён'}</p>
                          <p className="text-sm text-slate-500">{product?.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                      {displayQty}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {sale.total_amount?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      +{sale.profit?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sale.is_debt ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                          В долг {customer?.name && `(${customer.name})`}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                          Наличные
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Продажи не найдены</p>
          </div>
        )}
      </div>

      {/* New Sale Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новая продажа</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Product Search */}
            <div>
              <Label>Поиск товара *</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Введите бренд или модель..."
                  className="pl-10"
                />
              </div>
              
              {productSearch && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {filteredProducts.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => {
                        setFormData({ ...formData, product_id: product.id });
                        setProductSearch(`${product.brand} ${product.model}`);
                      }}
                      className={`p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 ${formData.product_id === product.id ? 'bg-indigo-50' : ''}`}
                    >
                      {product.photo_url ? (
                        <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{product.brand} {product.model}</p>
                        <p className="text-sm text-slate-500">
                          {product.boxes_in_stock} коробок • {product.sale_price?.toLocaleString()} с.
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="p-3 text-center text-slate-500 text-sm">Товары не найдены</p>
                  )}
                </div>
              )}
            </div>

            {/* Selected Product Info */}
            {selectedProduct && (
              <div className="p-4 bg-indigo-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  {selectedProduct.photo_url ? (
                    <img src={selectedProduct.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{selectedProduct.brand} {selectedProduct.model}</p>
                    <p className="text-sm text-slate-600">
                      На складе: {selectedProduct.boxes_in_stock} коробок
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Boxes Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Количество коробок *</Label>
                <Input 
                  type="number"
                  min="1"
                  max={selectedProduct?.boxes_in_stock || 999}
                  value={formData.boxes_sold}
                  onChange={(e) => setFormData({ ...formData, boxes_sold: parseInt(e.target.value) || 1 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Цена продажи за коробку</Label>
                <Input 
                  type="number"
                  value={formData.custom_sale_price}
                  onChange={(e) => setFormData({ ...formData, custom_sale_price: e.target.value })}
                  placeholder={selectedProduct?.sale_price || '0'}
                  className="mt-1.5"
                />
                <p className="text-xs text-slate-500 mt-1">
                  По умолчанию: {selectedProduct?.sale_price?.toLocaleString() || 0} с.
                </p>
              </div>
            </div>

            {/* Auto Calculations */}
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">Пар</p>
                  <p className="text-lg font-semibold text-slate-900">{pairsSold}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Штук</p>
                  <p className="text-lg font-semibold text-slate-900">{itemsSold}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Сумма</p>
                  <p className="text-lg font-semibold text-slate-900">{totalAmount.toLocaleString()} с.</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Прибыль</p>
                  <p className="text-lg font-semibold text-emerald-600">+{profit.toLocaleString()} с.</p>
                </div>
              </div>
            )}

            {/* Debt Sale */}
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl">
              <Checkbox 
                id="is_debt"
                checked={formData.is_debt}
                onCheckedChange={(checked) => setFormData({ ...formData, is_debt: checked })}
              />
              <label htmlFor="is_debt" className="font-medium text-slate-900 cursor-pointer">
                Продажа в долг
              </label>
            </div>

            {formData.is_debt && (
              <CustomerSearchSelect
                customers={customers}
                value={formData.customer_id}
                onChange={(v) => setFormData({ ...formData, customer_id: v })}
                businessId={business.id}
                onCustomerAdded={loadData}
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.product_id || formData.boxes_sold < 1 || (formData.is_debt && !formData.customer_id)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Продать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}