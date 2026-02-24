import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import DateFilter from '@/components/filters/DateFilter';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import CustomerSearchSelect from '@/components/search/CustomerSearchSelect';
import SaleDetailDialog from '@/components/sales/SaleDetailDialog';
import MultiSaleDialog from '@/components/sales/MultiSaleDialog';
import { 
  Plus, 
  ShoppingCart, 
  Package,
  Box,
  Layers,
  Hash,
  TrendingUp,
  Loader2,
  Search,
  ChevronRight,
  ChevronLeft,
  Grid3x3,
  List
} from 'lucide-react';
import ViewToggle from '@/components/ui/ViewToggle';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

const SALES_PAGE_SIZE = 25;
import { t } from '@/components/i18n/translations';
import { ru } from 'date-fns/locale';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';

export default function Sales() {
  const { can } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [multiDialogOpen, setMultiDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [displayUnit, setDisplayUnit] = useState('boxes'); // boxes, pairs, items
  const [sortBy, setSortBy] = useState('date'); // date, amount, profit, boxes
  const [view, setView] = useState('list'); // list, grid
  const [salesPage, setSalesPage] = useState(1);
  const [filterCustomer, setFilterCustomer] = useState('all');
  
  const [formData, setFormData] = useState({
    product_id: '',
    boxes_sold: 1,
    custom_sale_price: '',
    is_debt: false,
    customer_id: '',
    customer_name: '',
    customer_address: '',
    partial_payment: 0
  });
  const [productSearch, setProductSearch] = useState('');

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
        setLang(biz.language || 'ru');
        
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
    const partialPay = formData.is_debt ? parseFloat(formData.partial_payment) || 0 : 0;
    const remainingDebt = totalAmount - partialPay;
    
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
      customer_id: formData.is_debt ? formData.customer_id : '',
      customer_name: formData.customer_name || 'Неизвестный',
      customer_address: formData.customer_address || '',
      partial_payment: partialPay
    };

    // Optimistic UI update
    const optimisticSale = { ...saleData, id: 'temp_' + Date.now() };
    setSales(prev => [optimisticSale, ...prev]);

    try {
      const createdSale = await base44.entities.Sale.create(saleData);

      // Update product stock
      const newStock = Math.max(0, (selectedProduct.boxes_in_stock || 0) - parseInt(formData.boxes_sold));
      await base44.entities.Product.update(formData.product_id, { boxes_in_stock: newStock });

      // Update customer debt
      if (formData.is_debt && formData.customer_id) {
        const customer = customers.find(c => c.id === formData.customer_id);
        if (customer) {
          // Проверяем лимит долга
          const newTotalDebt = (customer.total_debt || 0) + remainingDebt;
          if (customer.debt_limit != null && newTotalDebt > customer.debt_limit) {
            setSaving(false);
            setSales(prev => prev.filter(s => !s.id?.startsWith('temp_')));
            alert(`⚠️ Превышен лимит долга клиента "${customer.name}"!\nЛимит: ${customer.debt_limit.toLocaleString()} с.\nТекущий долг: ${(customer.total_debt||0).toLocaleString()} с.\nНовый долг составит: ${newTotalDebt.toLocaleString()} с.`);
            return;
          }
          await base44.entities.Customer.update(formData.customer_id, {
            total_debt: (customer.total_debt || 0) + remainingDebt,
            total_paid: (customer.total_paid || 0) + partialPay
          });

          // Если была частичная оплата — создаём запись в DebtPayment для истории
          if (partialPay > 0) {
            await base44.entities.DebtPayment.create({
              business_id: business.id,
              customer_id: formData.customer_id,
              sale_id: createdSale.id,
              amount: partialPay,
              note: 'Частичная оплата при продаже',
              payment_date: new Date().toISOString()
            });
          }
          
          if (remainingDebt > 0 && customer.phone) {
            const waRes = await base44.functions.invoke('sendWhatsAppDebtMessage', {
              phone: customer.phone,
              customer_name: customer.name,
              product_name: selectedProduct ? `${selectedProduct.brand} ${selectedProduct.model}` : 'Товар',
              total_debt: totalAmount,
              paid_amount: partialPay,
              remaining_debt: remainingDebt,
              business_name: business.name,
              type: 'new_debt'
            });
            if (waRes.data?.wa_url) window.open(waRes.data.wa_url, '_blank');
          }
        }
      }
      
      await loadData();
      setDialogOpen(false);
      setFormData({ product_id: '', boxes_sold: 1, custom_sale_price: '', is_debt: false, customer_id: '', customer_name: '', customer_address: '', partial_payment: 0 });
      setProductSearch('');
    } catch (error) {
      console.error('Error saving sale:', error);
      setSales(prev => prev.filter(s => !s.id.startsWith('temp_')));
    } finally {
      setSaving(false);
    }
  };

  // Быстрые переключатели периода для продаж
  const setSalesQuickPeriod = (period) => {
    const now = new Date();
    if (period === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (period === 'week') setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    else if (period === 'month') setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    else if (period === 'all') setDateRange(null);
    setSalesPage(1);
  };

  // Фильтрация продаж для отображения в списке (все, включая отменённые)
  let filteredSales = sales.filter(sale => {
    const product = products.find(p => p.id === sale.product_id);
    const customer = customers.find(c => c.id === sale.customer_id);
    const matchesSearch = !search ||
      product?.brand?.toLowerCase().includes(search.toLowerCase()) ||
      product?.model?.toLowerCase().includes(search.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sale.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse = filterWarehouse === 'all' || sale.warehouse_id === filterWarehouse;
    const matchesCustomer = filterCustomer === 'all' || sale.customer_id === filterCustomer;
    
    let matchesDate = true;
    if (dateRange?.from) {
      const saleDate = parseISO(sale.sale_date || sale.created_date);
      matchesDate = isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
    }
    
    return matchesSearch && matchesWarehouse && matchesDate && matchesCustomer;
  });

  // Сортировка
  filteredSales = [...filteredSales].sort((a, b) => {
    switch(sortBy) {
      case 'amount':
        return (b.total_amount || 0) - (a.total_amount || 0);
      case 'profit':
        return (b.profit || 0) - (a.profit || 0);
      case 'boxes':
        return (b.boxes_sold || 0) - (a.boxes_sold || 0);
      case 'date':
      default:
        return new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date);
    }
  });

  // Пагинация продаж
  const totalSalesPages = Math.ceil(filteredSales.length / SALES_PAGE_SIZE);
  const paginatedSales = filteredSales.slice((salesPage - 1) * SALES_PAGE_SIZE, salesPage * SALES_PAGE_SIZE);

  // Итоги — ТОЛЬКО по НЕ отменённым продажам (для корректной статистики)
  const activeSales = filteredSales.filter(s => !s.is_cancelled);
  const totals = activeSales.reduce((acc, sale) => ({
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
    <PullToRefresh onRefresh={loadData}>
    <div className="space-y-6">
      <PageHeader 
        title={t(lang,'sales_title')}
        subtitle={`${filteredSales.length} ${t(lang,'dash_sales_count')}`}
        actions={
          <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50">
                <Plus className="w-4 h-4" />
                1 товар
              </Button>
              <Button onClick={() => setMultiDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <ShoppingCart className="w-4 h-4" />
                Несколько товаров
              </Button>
            </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-slate-500">{t(lang,'sales_boxes_label')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.boxes}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-slate-500">{t(lang,'sales_pairs_label')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.pairs}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-slate-500">{t(lang,'sales_items_label')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.items}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-500">{t(lang,'sales_revenue')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-500">{t(lang,'sales_profit')}</span>
          </div>
          {can('view_profit') ? (
            <p className="text-2xl font-bold text-emerald-600">{totals.profit.toLocaleString()}</p>
          ) : (
            <p className="text-2xl font-bold text-slate-300">••••• с.</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        {/* Quick period buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { key: 'today', label: 'Сегодня' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
          ].map(f => (
            <button key={f.key} onClick={() => setSalesQuickPeriod(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white text-slate-600 border-slate-200 hover:border-indigo-400 transition-all">
              {f.label}
            </button>
          ))}
          <DateFilter dateRange={dateRange} onDateRangeChange={r => { setDateRange(r); setSalesPage(1); }} />
          <span className="ml-auto text-xs text-slate-400">{filteredSales.length} продаж</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder={t(lang,'sales_search')}
            className="w-full sm:w-64"
          />
          <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t(lang,'prod_warehouse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang,'sales_wh_all')}</SelectItem>
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
              <SelectItem value="boxes">{t(lang,'sales_boxes')}</SelectItem>
              <SelectItem value="pairs">{t(lang,'sales_pairs')}</SelectItem>
              <SelectItem value="items">{t(lang,'sales_items')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">По дате (новые)</SelectItem>
              <SelectItem value="amount">По сумме</SelectItem>
              <SelectItem value="profit">По прибыли</SelectItem>
              <SelectItem value="boxes">По коробкам</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sales List/Grid */}
      {view === 'list' ? (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-center text-sm font-medium text-slate-400 w-8">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t(lang,'sales_date')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t(lang,'sales_product')}</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">
                  {displayUnit === 'boxes' ? t(lang,'sales_boxes_label') : displayUnit === 'pairs' ? t(lang,'sales_pairs_label') : t(lang,'sales_items_label')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">{t(lang,'sales_amount')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">{t(lang,'sales_profit')}</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">{t(lang,'sales_type')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSales.map((sale, idx) => {
                const globalIdx = (salesPage - 1) * SALES_PAGE_SIZE + idx;
                const product = products.find(p => p.id === sale.product_id);
                const customer = customers.find(c => c.id === sale.customer_id);
                const displayQty = displayUnit === 'boxes' ? sale.boxes_sold : 
                                  displayUnit === 'pairs' ? sale.pairs_sold : sale.items_sold;
                return (
                  <tr 
                    key={sale.id} 
                    className={`hover:bg-slate-50 cursor-pointer ${sale.is_cancelled ? 'opacity-50' : ''}`}
                    onClick={() => setSelectedSale(sale)}
                  >
                    <td className="px-3 py-3 text-center text-xs font-mono text-slate-400 select-none">{globalIdx + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM, HH:mm', { locale: ru })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product?.photo_url ? (
                          <img src={product.photo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{product?.brand || t(lang,'sales_deleted')} {product?.model}</p>
                          {sale.is_cancelled && <span className="text-xs text-red-500">{t(lang,'sales_cancelled')}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-600">{displayQty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {sale.total_amount?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {can('view_profit') ? `+${sale.profit?.toLocaleString()} с.` : '••• с.'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${sale.is_debt ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {sale.is_debt ? `${t(lang,'sales_in_debt')}${customer?.name ? ` (${customer.name})` : ''}` : t(lang,'sales_cash')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedSales.map(sale => {
            const product = products.find(p => p.id === sale.product_id);
            const customer = customers.find(c => c.id === sale.customer_id);
            return (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className={`p-4 active:bg-slate-50 cursor-pointer ${sale.is_cancelled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {product?.photo_url ? (
                    <img src={product.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{product?.brand} {product?.model}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-900 text-sm">{sale.total_amount?.toLocaleString()} с.</p>
                        <p className="text-xs text-emerald-600">{can('view_profit') ? `+${sale.profit?.toLocaleString()} с.` : '••• с.'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${sale.is_debt ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {sale.is_debt ? t(lang,'sales_in_debt') : t(lang,'sales_cash')}
                        </span>
                        <span className="text-xs text-slate-500">{sale.boxes_sold} {t(lang,'sales_boxes_short')}</span>
                        {sale.is_cancelled && <span className="text-xs text-red-500 font-medium">{t(lang,'sales_cancelled')}</span>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                    {(customer?.name || sale.customer_name) && sale.customer_name !== 'Неизвестный' && (
                      <p className="text-xs text-slate-500 mt-1">👤 {customer?.name || sale.customer_name}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>{t(lang,'sales_not_found')}</p>
          </div>
        )}
        {totalSalesPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3 border-t border-slate-100 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setSalesPage(1)} disabled={salesPage === 1} className="text-xs px-2">«</Button>
            <Button variant="outline" size="sm" onClick={() => setSalesPage(p => Math.max(1, p - 1))} disabled={salesPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalSalesPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalSalesPages || Math.abs(p - salesPage) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...' ? (
                <span key={`ellipsis-${i}`} className="text-slate-400 px-1 text-sm">…</span>
              ) : (
                <Button key={p} variant={salesPage === p ? 'default' : 'outline'} size="sm"
                  onClick={() => setSalesPage(p)}
                  className={`w-8 text-xs ${salesPage === p ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}>
                  {p}
                </Button>
              ))
            }
            <Button variant="outline" size="sm" onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))} disabled={salesPage === totalSalesPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSalesPage(totalSalesPages)} disabled={salesPage === totalSalesPages} className="text-xs px-2">»</Button>
            <span className="text-xs text-slate-400 ml-2">{filteredSales.length} продаж</span>
          </div>
        )}
        </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedSales.map(sale => {
          const product = products.find(p => p.id === sale.product_id);
          const customer = customers.find(c => c.id === sale.customer_id);
          const displayQty = displayUnit === 'boxes' ? sale.boxes_sold : 
                            displayUnit === 'pairs' ? sale.pairs_sold : sale.items_sold;
          return (
            <div
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className={`p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition cursor-pointer ${sale.is_cancelled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3 mb-3">
                {product?.photo_url ? (
                  <img src={product.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{product?.brand} {product?.model}</p>
                  <p className="text-xs text-slate-500">
                    {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Сумма:</span>
                  <span className="font-semibold text-slate-900">{sale.total_amount?.toLocaleString()} с.</span>
                </div>
                {can('view_profit') && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Прибыль:</span>
                  <span className="font-semibold text-emerald-600">+{sale.profit?.toLocaleString()} с.</span>
                </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{displayUnit === 'boxes' ? 'Кор.' : displayUnit === 'pairs' ? 'Пар' : 'Шт'}:</span>
                  <span className="font-semibold text-indigo-600">{displayQty}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${sale.is_debt ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {sale.is_debt ? `${t(lang,'sales_in_debt')}${customer?.name ? ` (${customer.name})` : ''}` : t(lang,'sales_cash')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
        )}
        {filteredSales.length === 0 && view === 'grid' && (
        <div className="text-center py-12 text-slate-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>{t(lang,'sales_not_found')}</p>
        </div>
        )}
        {totalSalesPages > 1 && view === 'grid' && (
          <div className="flex items-center justify-center gap-1.5 py-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setSalesPage(1)} disabled={salesPage === 1} className="text-xs px-2">«</Button>
            <Button variant="outline" size="sm" onClick={() => setSalesPage(p => Math.max(1, p - 1))} disabled={salesPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalSalesPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalSalesPages || Math.abs(p - salesPage) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...' ? (
                <span key={`ellipsis-grid-${i}`} className="text-slate-400 px-1 text-sm">…</span>
              ) : (
                <Button key={p} variant={salesPage === p ? 'default' : 'outline'} size="sm"
                  onClick={() => setSalesPage(p)}
                  className={`w-8 text-xs ${salesPage === p ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}>
                  {p}
                </Button>
              ))
            }
            <Button variant="outline" size="sm" onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))} disabled={salesPage === totalSalesPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSalesPage(totalSalesPages)} disabled={salesPage === totalSalesPages} className="text-xs px-2">»</Button>
          </div>
        )}

      {/* Sale Detail Dialog */}
      {selectedSale && (
        <SaleDetailDialog
          sale={selectedSale}
          product={products.find(p => p.id === selectedSale.product_id)}
          customer={customers.find(c => c.id === selectedSale.customer_id)}
          onClose={() => setSelectedSale(null)}
          onUpdated={() => { loadData(); setSelectedSale(null); }}
        />
      )}

      {/* Multi Sale Dialog */}
      <MultiSaleDialog
        open={multiDialogOpen}
        onClose={() => setMultiDialogOpen(false)}
        products={products}
        customers={customers}
        business={business}
        lang={lang}
        onSaved={() => { loadData(); setMultiDialogOpen(false); }}
      />

      {/* New Sale Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t(lang,'sales_new')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Product Search */}
            <div>
              <Label>{t(lang,'sales_search_product')} *</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={t(lang,'sales_search_placeholder')}
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
                          {product.boxes_in_stock} {t(lang,'sales_boxes_label').toLowerCase()} • {product.sale_price?.toLocaleString()} с.
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
                      {t(lang,'sales_on_stock')}: {selectedProduct.boxes_in_stock} {t(lang,'sales_boxes_label').toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Boxes Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t(lang,'sales_qty_boxes')} *</Label>
                <Input 
                  type="text"
                  pattern="[0-9]*"
                  min="1"
                  max={selectedProduct?.boxes_in_stock || 999}
                  value={formData.boxes_sold}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, boxes_sold: val ? parseInt(val) : '' });
                  }}
                  className="mt-1.5"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>{t(lang,'sales_price_per_box')}</Label>
                <Input 
                  type="text"
                  pattern="[0-9.]*"
                  inputMode="decimal"
                  value={formData.custom_sale_price}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, custom_sale_price: val });
                  }}
                  placeholder={selectedProduct?.sale_price || '0'}
                  className="mt-1.5"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {t(lang,'sales_default_price')}: {selectedProduct?.sale_price?.toLocaleString() || 0} с.
                </p>
              </div>
            </div>

            {/* Auto Calculations */}
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">{t(lang,'sales_pairs_label')}</p>
                  <p className="text-lg font-semibold text-slate-900">{pairsSold}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t(lang,'sales_items_label')}</p>
                  <p className="text-lg font-semibold text-slate-900">{itemsSold}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t(lang,'sales_amount')}</p>
                  <p className="text-lg font-semibold text-slate-900">{totalAmount.toLocaleString()} с.</p>
                </div>
                {can('view_profit') && (
                <div>
                  <p className="text-sm text-slate-500">{t(lang,'sales_profit')}</p>
                  <p className="text-lg font-semibold text-emerald-600">+{profit.toLocaleString()} с.</p>
                </div>
                )}
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
                {t(lang,'sales_debt_sale')}
              </label>
            </div>

            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <Label>{t(lang,'sales_customer_name')}</Label>
                <Input 
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder={t(lang,'sales_not_specified')}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'sales_customer_address')}</Label>
                <Input 
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  placeholder={t(lang,'sales_not_specified')}
                  className="mt-1.5"
                />
              </div>
            </div>

            {formData.is_debt && (
              <>
                <CustomerSearchSelect
                  customers={customers}
                  value={formData.customer_id}
                  onChange={(v) => setFormData({ ...formData, customer_id: v })}
                  businessId={business.id}
                  onCustomerAdded={loadData}
                />
                
                {formData.customer_id && (
                  <div>
                    <Label>{t(lang,'sales_partial_pay')}</Label>
                    <Input 
                      type="text"
                      pattern="[0-9.]*"
                      inputMode="decimal"
                      value={formData.partial_payment}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setFormData({ ...formData, partial_payment: val });
                      }}
                      placeholder="0"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {t(lang,'sales_remaining_debt')}: {(totalAmount - (parseFloat(formData.partial_payment) || 0)).toLocaleString()} с.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t(lang,'cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.product_id || formData.boxes_sold < 1 || (formData.is_debt && !formData.customer_id)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t(lang,'sales_sell_btn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      </PullToRefresh>
      );
      }