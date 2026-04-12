import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/search/SearchableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ViewToggle from '@/components/ui/ViewToggle';
import { 
  Plus, 
  Package, 
  Edit2, 
  Trash2, 
  Upload,
  Loader2,
  Box,
  Filter,
  Calendar,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { t } from '@/components/i18n/translations';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageLoader from '@/components/ui/PageLoader';

const PAGE_SIZE = 20;

const BASE_PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const BASE_COLORS = ['Чёрный', 'Белый', 'Коричневый', 'Синий', 'Красный', 'Серый', 'Бежевый', 'Другой'];

export default function Products() {
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [view, setView] = useState('grid');
  const [sortBy, setSortBy] = useState('name'); // name, stock, price, value
  const [hideImages, setHideImages] = useState(false);
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, custom
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    product_type: 'Туфли',
    color: 'Чёрный',
    size_from: 39,
    size_to: 44,
    pairs_per_box: 6,
    purchase_price: '',
    sale_price: '',
    boxes_in_stock: 0,
    warehouse_id: '',
    photo_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      let biz = window.__barakatBusiness;
      if (!biz) {
        // Сначала проверяем режим сотрудника
        const savedMode = localStorage.getItem('barakatcrm_mode') || sessionStorage.getItem('barakatcrm_mode');
        if (savedMode && savedMode.startsWith('employee_')) {
          const empId = savedMode.replace('employee_', '');
          const empRecords = await base44.entities.Employee.filter({ user_email: user.email, is_active: true });
          const emp = empRecords.find(e => e.id === empId) || empRecords[0];
          if (emp) {
            const bizList = await base44.entities.Business.filter({ id: emp.business_id });
            if (bizList.length > 0) biz = bizList[0];
          }
        }
        if (!biz) {
          const businesses = await base44.entities.Business.filter({ owner_email: user.email });
          if (businesses.length > 0) biz = businesses[0];
        }
      }
      
      if (biz) {
        setBusiness(biz);
        setLang(biz.language || 'ru');
        
        const [productsData, warehousesData] = await Promise.all([
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Warehouse.filter({ business_id: biz.id })
        ]);
        
        setProducts(productsData);
        setWarehouses(warehousesData);
        
        // Установить значения по умолчанию из бизнеса
        setFormData(prev => ({
          ...prev,
          color: biz.default_color || 'Чёрный',
          size_from: biz.default_size_from || 39,
          size_to: biz.default_size_to || 44,
          pairs_per_box: biz.default_pairs_per_box || 6,
          product_type: biz.default_product_type || 'Туфли'
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        brand: product.brand || '',
        model: product.model || '',
        product_type: product.product_type || 'Туфли',
        color: product.color || 'Чёрный',
        size_from: product.size_from || 39,
        size_to: product.size_to || 44,
        pairs_per_box: product.pairs_per_box || 6,
        purchase_price: product.purchase_price || '',
        sale_price: product.sale_price || '',
        boxes_in_stock: product.boxes_in_stock || 0,
        warehouse_id: product.warehouse_id || '',
        photo_url: product.photo_url || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        brand: '',
        model: '',
        product_type: business?.default_product_type || 'Туфли',
        color: business?.default_color || 'Чёрный',
        size_from: business?.default_size_from || 39,
        size_to: business?.default_size_to || 44,
        pairs_per_box: business?.default_pairs_per_box || 6,
        purchase_price: '',
        sale_price: '',
        boxes_in_stock: 0,
        warehouse_id: warehouses[0]?.id || '',
        photo_url: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (saving) return; // Защита от двойного нажатия
    setSaving(true);
    setDialogOpen(false); // Закрываем сразу, чтобы нельзя было нажать снова
    
    const data = {
      ...formData,
      business_id: business.id,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      sale_price: parseFloat(formData.sale_price) || 0,
      boxes_in_stock: parseInt(formData.boxes_in_stock) || 0,
      size_from: parseInt(formData.size_from) || 39,
      size_to: parseInt(formData.size_to) || 44,
      pairs_per_box: parseInt(formData.pairs_per_box) || 6
    };

    // Optimistic UI update
    const optimisticProduct = { ...data, id: editingProduct?.id || 'temp_' + Date.now() };
    setProducts(prev => editingProduct 
      ? prev.map(p => p.id === editingProduct.id ? optimisticProduct : p)
      : [optimisticProduct, ...prev]
    );

    try {
      const user = await base44.auth.me();
      if (editingProduct) {
        // Вычисляем diff — что изменилось
        const changedFields = {};
        const oldData = {};
        const fieldLabels = {
          brand: 'Бренд', model: 'Модель', product_type: 'Тип', color: 'Цвет',
          size_from: 'Размер от', size_to: 'Размер до', pairs_per_box: 'Пар в коробке',
          purchase_price: 'Цена закупки', sale_price: 'Цена продажи', boxes_in_stock: 'Коробок на складе'
        };
        Object.keys(fieldLabels).forEach(key => {
          if (String(editingProduct[key]) !== String(data[key])) {
            changedFields[key] = { from: editingProduct[key], to: data[key], label: fieldLabels[key] };
            oldData[key] = editingProduct[key];
          }
        });
        await base44.entities.Product.update(editingProduct.id, data);
        if (Object.keys(changedFields).length > 0) {
          await base44.entities.ActivityLog.create({
            business_id: business.id,
            action_type: 'update',
            entity_type: 'Product',
            entity_id: editingProduct.id,
            entity_data: { old: oldData, new: data, changes: changedFields },
            user_email: user.email,
            description: `Обновлён товар: ${data.brand} ${data.model} (${Object.values(changedFields).map(c => c.label).join(', ')})`
          });
        }
      } else {
        const created = await base44.entities.Product.create(data);
        await base44.entities.ActivityLog.create({
          business_id: business.id,
          action_type: 'create',
          entity_type: 'Product',
          entity_id: created.id,
          entity_data: data,
          user_email: user.email,
          description: `Добавлен товар: ${data.brand} ${data.model} (${data.boxes_in_stock} кор., ${data.sale_price?.toLocaleString()} с.)`
        });
      }
      await loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (confirm(t(lang, 'prod_delete_confirm'))) {
      try {
        const product = products.find(p => p.id === productId);
        const user = await base44.auth.me();
        
        // Логируем удаление
        await base44.entities.ActivityLog.create({
          business_id: business.id,
          action_type: 'delete',
          entity_type: 'Product',
          entity_id: productId,
          entity_data: product,
          user_email: user.email,
          description: `Удалён товар: ${product.brand} ${product.model}`
        });
        
        await base44.entities.Product.delete(productId);
        await loadData();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData({ ...formData, photo_url: file_url });
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }
  };

  // Все типы и цвета (базовые + кастомные)
  const allProductTypes = [...BASE_PRODUCT_TYPES, ...(business?.custom_product_types || [])];
  const allColors = [...BASE_COLORS, ...(business?.custom_colors || [])];
  const lowStockLimit = business?.low_stock_limit ?? 2;

  // Фильтрация
  let filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.brand?.toLowerCase().includes(search.toLowerCase()) ||
      product.model?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || product.product_type === filterType;
    const matchesWarehouse = filterWarehouse === 'all' || product.warehouse_id === filterWarehouse;
    return matchesSearch && matchesType && matchesWarehouse;
  });

  // Сортировка
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch(sortBy) {
      case 'stock':
        return (b.boxes_in_stock || 0) - (a.boxes_in_stock || 0);
      case 'price':
        return (b.sale_price || 0) - (a.sale_price || 0);
      case 'value':
        const valA = (a.boxes_in_stock || 0) * (a.sale_price || 0);
        const valB = (b.boxes_in_stock || 0) * (b.sale_price || 0);
        return valB - valA;
      case 'date':
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      case 'name':
      default:
        return (a.brand + a.model).localeCompare(b.brand + b.model);
    }
  });

  // Фильтр по дате добавления
  if (dateFilter !== 'all') {
    filteredProducts = filteredProducts.filter(p => {
      const d = parseISO(p.created_date);
      if (dateFilter === 'today') return isToday(d);
      if (dateFilter === 'week') return isThisWeek(d, { weekStartsOn: 1 });
      if (dateFilter === 'month') return isThisMonth(d);
      if (dateFilter === 'custom' && customDateFrom) {
        const from = startOfDay(new Date(customDateFrom));
        const to = endOfDay(new Date(customDateTo || customDateFrom));
        return isWithinInterval(d, { start: from, end: to });
      }
      return true;
    });
  }

  // Пагинация
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Расчёт общей стоимости
  const totalStockValue = filteredProducts.reduce((sum, p) => 
    sum + ((p.boxes_in_stock || 0) * (p.sale_price || 0)), 0
  );

  if (!isReady) return <PageLoader message="Загрузка..." />;
  if (!can('view_products')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Нет доступа</h3>
            <p className="text-slate-600">У вас нет прав для просмотра товаров.<br/>Обратитесь к владельцу бизнеса.</p>
          </div>
        </div>
      </div>
    );
  }
  if (loading) return <PageLoader message="Загрузка товаров..." />;

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="space-y-6">
      <PageHeader 
        title={t(lang,'prod_title')}
        subtitle={`${products.length} ${t(lang,'prod_subtitle_count')} ${can('view_stock_value') ? `${totalStockValue.toLocaleString()} ${t(lang,'dash_somoni')}` : '••••• с.'}`}
        actions={
          can('add_products') && (
            <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              {t(lang,'prod_add')}
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-2">
        {/* Date filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: 'Все' },
            { key: 'today', label: 'Сегодня' },
            { key: 'week', label: 'Нед.' },
            { key: 'month', label: 'Мес.' },
            { key: 'custom', label: '📅' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setDateFilter(f.key); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${dateFilter === f.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}
            >
              {f.label}
            </button>
          ))}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Input type="date" value={customDateFrom} onChange={e => { setCustomDateFrom(e.target.value); setPage(1); }} className="h-7 text-xs w-32" />
              <span className="text-xs text-slate-400">—</span>
              <Input type="date" value={customDateTo} onChange={e => { setCustomDateTo(e.target.value); setPage(1); }} className="h-7 text-xs w-32" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput 
            value={search} 
            onChange={v => { setSearch(v); setPage(1); }} 
            placeholder={t(lang,'prod_search')}
            className="w-full sm:w-56"
          />
          <div className="flex flex-wrap gap-2">
          <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder={t(lang,'prod_type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang,'prod_type_all')}</SelectItem>
              {allProductTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterWarehouse} onValueChange={v => { setFilterWarehouse(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder={t(lang,'prod_warehouse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang,'prod_wh_all')}</SelectItem>
              {warehouses.map(wh => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">По названию</SelectItem>
              <SelectItem value="date">По дате</SelectItem>
              <SelectItem value="stock">По складу</SelectItem>
              <SelectItem value="price">По цене</SelectItem>
              <SelectItem value="value">По стоимости</SelectItem>
            </SelectContent>
          </Select>
          <ViewToggle view={view} onChange={setView} />
          <button
            onClick={() => setHideImages(h => !h)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${hideImages ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}
          >
            <Package className="w-3 h-3" />
            <span className="hidden sm:inline">{hideImages ? 'С фото' : 'Без фото'}</span>
          </button>
          <span className="text-xs text-slate-400">{filteredProducts.length}</span>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {view === 'grid' ? (
        <div className={hideImages ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"}>
          {paginatedProducts.map((product, idx) => {
            const globalIdx = (page - 1) * PAGE_SIZE + idx;
            const totalPairs = (product.boxes_in_stock || 0) * (product.pairs_per_box || 6);
            const totalItems = totalPairs * 2;
            const isLowStock = (product.boxes_in_stock || 0) <= lowStockLimit;
            return hideImages ? (
              // Компактная карточка без фото
              <div key={product.id} className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${isLowStock ? 'border-red-300 bg-red-50' : 'border-slate-100 shadow-sm'}`}>
                <div className={`flex items-center justify-between px-3 pt-2.5 pb-1 ${isLowStock ? 'border-b border-red-200' : 'border-b border-slate-100'}`}>
                  <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono text-slate-300 select-none">{idx + 1}</span>
                    <p className={`font-bold text-sm truncate ${isLowStock ? 'text-red-700' : 'text-slate-900'}`}>{product.brand}</p>
                    <p className={`text-xs truncate ${isLowStock ? 'text-red-500' : 'text-slate-500'}`}>{product.model}</p>
                  </div>
                  <div className="flex gap-1 ml-1 flex-shrink-0">
                    {can('edit_products') && (
                      <button onClick={() => handleOpenDialog(product)} className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200">
                        <Edit2 className="w-3 h-3 text-slate-600" />
                      </button>
                    )}
                    {can('delete_products') && (
                      <button onClick={() => handleDelete(product.id)} className="p-1 bg-slate-100 rounded-lg hover:bg-red-100">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isLowStock ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      <Box className="w-3 h-3" />
                      {product.boxes_in_stock || 0} кор.
                      {isLowStock && <span className="text-[10px]">⚠️</span>}
                    </div>
                    <span className={`text-xs font-medium ${isLowStock ? 'text-red-500' : 'text-emerald-600'}`}>{can('view_stock_value') ? `${product.sale_price?.toLocaleString()} с.` : '••• с.'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{product.color} • {product.size_from}-{product.size_to}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLowStock ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{product.product_type}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={product.id}
                onClick={() => handleOpenDialog(product)}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${isLowStock ? 'border-red-400 animate-pulse-border' : 'border-slate-100'}`}>
                <div className="aspect-square bg-slate-100 relative">
                  {product.photo_url ? (
                    <img src={product.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                  {isLowStock && (
                    <div className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">⚠️</div>
                  )}
                  {can('delete_products') && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="absolute top-1 right-1 p-1 bg-white rounded-lg shadow hover:bg-red-50">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  )}
                </div>
                <div className="p-2">
                  <p className={`font-semibold text-xs truncate ${isLowStock ? 'text-red-700' : 'text-slate-900'}`}>{product.brand}</p>
                  <p className={`text-[10px] truncate ${isLowStock ? 'text-red-400' : 'text-slate-500'}`}>{product.model}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs font-bold ${isLowStock ? 'text-red-600' : 'text-indigo-600'}`}>{product.boxes_in_stock || 0} кор.</span>
                    <span className="text-[10px] text-emerald-600 font-medium">{can('view_stock_value') ? `${product.sale_price?.toLocaleString()} с.` : '•••'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {paginatedProducts.map((product, idx) => {
              const globalIdx = (page - 1) * PAGE_SIZE + idx;
              const totalPairs = (product.boxes_in_stock || 0) * (product.pairs_per_box || 6);
              const stockValue = (product.boxes_in_stock || 0) * (product.sale_price || 0);
              const warehouse = warehouses.find(w => w.id === product.warehouse_id);
              const isLowStock = (product.boxes_in_stock || 0) <= lowStockLimit;
              const isExpanded = expandedRow === product.id;
              return (
                <div key={product.id}>
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : product.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isLowStock ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                    {product.photo_url ? (
                      <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isLowStock ? 'text-red-700' : 'text-slate-900'}`}>{product.brand} {product.model}</p>
                      <p className="text-xs text-slate-400 truncate">{product.product_type} · {product.color}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-indigo-600'}`}>{product.boxes_in_stock || 0} кор.</p>
                      <p className="text-xs text-emerald-600">{can('view_stock_value') ? `${product.sale_price?.toLocaleString()} с.` : '•••'}</p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="bg-slate-50 px-4 py-3 space-y-3 border-t border-slate-100">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white rounded-xl p-2 border border-slate-100">
                          <p className="text-slate-400">Коробок</p>
                          <p className={`font-bold text-base ${isLowStock ? 'text-red-600' : 'text-indigo-600'}`}>{product.boxes_in_stock || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-100">
                          <p className="text-slate-400">Пар</p>
                          <p className="font-bold text-base text-slate-700">{totalPairs}</p>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-100">
                          <p className="text-slate-400">Штук</p>
                          <p className="font-bold text-base text-slate-700">{totalPairs * 2}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white rounded-xl p-2 border border-slate-100">
                          <p className="text-slate-400">Размеры</p>
                          <p className="font-semibold text-slate-800">{product.size_from}–{product.size_to}</p>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-100">
                          <p className="text-slate-400">Склад</p>
                          <p className="font-semibold text-slate-800 truncate">{warehouse?.name || '—'}</p>
                        </div>
                        {can('view_stock_value') && (
                          <>
                            <div className="bg-white rounded-xl p-2 border border-slate-100">
                              <p className="text-slate-400">Закупка / кор.</p>
                              <p className="font-semibold text-slate-800">{product.purchase_price?.toLocaleString()} с.</p>
                            </div>
                            <div className="bg-white rounded-xl p-2 border border-slate-100">
                              <p className="text-slate-400">Стоимость склада</p>
                              <p className="font-semibold text-emerald-600">{stockValue.toLocaleString()} с.</p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {can('edit_products') && (
                          <button onClick={(e) => { e.stopPropagation(); handleOpenDialog(product); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
                            <Edit2 className="w-3.5 h-3.5" /> Редактировать
                          </button>
                        )}
                        {can('delete_products') && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t(lang,'prod_not_found')}</p>
          <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
            {t(lang,'prod_add_first')}
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1} className="text-xs px-2">«</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === '...' ? (
              <span key={`ellipsis-${i}`} className="text-slate-400 px-1 text-sm">…</span>
            ) : (
              <Button key={p} variant={page === p ? 'default' : 'outline'} size="sm"
                onClick={() => setPage(p)}
                className={`w-8 text-xs ${page === p ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}>
                {p}
              </Button>
            ))
          }
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="text-xs px-2">»</Button>
          <span className="text-xs text-slate-400 ml-2">{filteredProducts.length} товаров</span>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? t(lang,'prod_edit') : t(lang,'prod_add')}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Product Info & Timestamps */}
            {editingProduct && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <p className="text-slate-500">Дата добавления</p>
                  <p className="font-semibold text-slate-900 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {editingProduct.created_date ? format(parseISO(editingProduct.created_date), 'dd MMM yyyy, HH:mm:ss', { locale: ru }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Последнее обновление</p>
                  <p className="font-semibold text-slate-900 flex items-center gap-1 mt-1">
                    <History className="w-3 h-3" />
                    {editingProduct.updated_date ? format(parseISO(editingProduct.updated_date), 'dd MMM yyyy, HH:mm:ss', { locale: ru }) : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Photo Upload */}
            <div>
              <Label>{t(lang,'prod_photo')}</Label>
              <div className="mt-2 flex items-center gap-4">
                {formData.photo_url ? (
                  <img src={formData.photo_url} alt="" className="w-24 h-24 rounded-xl object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  <div className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {t(lang,'prod_upload_photo')}
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t(lang,'prod_brand')} *</Label>
                <Input 
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Nike, Adidas..."
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'prod_model')} *</Label>
                <Input 
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Air Max, Ultra Boost..."
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label={t(lang,'prod_type')}
                options={allProductTypes}
                value={formData.product_type}
                onChange={(v) => setFormData({ ...formData, product_type: v })}
                placeholder={t(lang,'prod_search_type')}
              />
              <SearchableSelect
                label={t(lang,'prod_color')}
                options={allColors}
                value={formData.color}
                onChange={(v) => setFormData({ ...formData, color: v })}
                placeholder={t(lang,'prod_search_color')}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t(lang,'prod_size_from')}</Label>
                <Input 
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={formData.size_from}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, size_from: val });
                  }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'prod_size_to')}</Label>
                <Input 
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={formData.size_to}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, size_to: val });
                  }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'prod_pairs_box')}</Label>
                <Select value={String(formData.pairs_per_box)} onValueChange={(v) => setFormData({ ...formData, pairs_per_box: parseInt(v) })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">{t(lang,'prod_pairs_4')}</SelectItem>
                    <SelectItem value="6">{t(lang,'prod_pairs_6')}</SelectItem>
                    <SelectItem value="8">{t(lang,'prod_pairs_8')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t(lang,'prod_purchase_price')} *</Label>
                <Input 
                  type="text"
                  pattern="[0-9.]*"
                  inputMode="decimal"
                  value={formData.purchase_price}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, purchase_price: val });
                  }}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'prod_sale_price')} *</Label>
                <Input 
                  type="text"
                  pattern="[0-9.]*"
                  inputMode="decimal"
                  value={formData.sale_price}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, sale_price: val });
                  }}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'prod_boxes_stock')}</Label>
                <Input 
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={formData.boxes_in_stock}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, boxes_in_stock: val });
                  }}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
            </div>

            {warehouses.length > 0 && (
              <SearchableSelect
                label={t(lang,'prod_warehouse')}
                options={warehouses.map(w => w.name)}
                value={warehouses.find(w => w.id === formData.warehouse_id)?.name || ''}
                onChange={(name) => {
                  const wh = warehouses.find(w => w.name === name);
                  setFormData({ ...formData, warehouse_id: wh?.id || '' });
                }}
                placeholder={t(lang,'prod_search_wh')}
              />
            )}
            
            {/* Auto Calculations */}
            {formData.boxes_in_stock > 0 && formData.sale_price && (
              <div className="p-4 bg-indigo-50 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-3">{t(lang,'prod_auto_calc')}</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-500">{t(lang,'prod_boxes')}</p>
                    <p className="text-xl font-bold text-indigo-600">{formData.boxes_in_stock}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t(lang,'prod_pairs')}</p>
                    <p className="text-xl font-bold text-slate-700">
                      {parseInt(formData.boxes_in_stock) * (parseInt(formData.pairs_per_box) || 6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t(lang,'prod_items')}</p>
                    <p className="text-xl font-bold text-slate-700">
                      {parseInt(formData.boxes_in_stock) * (parseInt(formData.pairs_per_box) || 6) * 2}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-200">
                  {can('view_stock_value') && (
                  <div>
                    <p className="text-sm text-slate-500">{t(lang,'prod_total_value')}</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(parseInt(formData.boxes_in_stock) * (parseFloat(formData.sale_price) || 0)).toLocaleString()} с.
                    </p>
                  </div>
                  )}
                  {can('view_profit') && (
                  <div>
                    <p className="text-sm text-slate-500">{t(lang,'prod_total_profit')}</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {(parseInt(formData.boxes_in_stock) * ((parseFloat(formData.sale_price) || 0) - (parseFloat(formData.purchase_price) || 0))).toLocaleString()} с.
                    </p>
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {editingProduct && (
            <Collapsible className="border border-slate-200 rounded-lg overflow-hidden">
              <CollapsibleTrigger className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors">
                <History className="w-4 h-4" />
                История изменений
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 bg-white border-t border-slate-200 space-y-3">
                <div className="text-xs space-y-2">
                  <div className="flex items-start gap-2 pb-2 border-b border-slate-100">
                    <Calendar className="w-3 h-3 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">Создано</p>
                      <p className="text-slate-500">{editingProduct.created_date ? format(parseISO(editingProduct.created_date), 'dd MMMM yyyy в HH:mm:ss', { locale: ru }) : '—'}</p>
                    </div>
                  </div>
                  {editingProduct.updated_date && editingProduct.updated_date !== editingProduct.created_date && (
                    <div className="flex items-start gap-2 pt-1">
                      <History className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">Последнее обновление</p>
                        <p className="text-slate-500">{format(parseISO(editingProduct.updated_date), 'dd MMMM yyyy в HH:mm:ss', { locale: ru })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t(lang,'cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.brand || !formData.model}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProduct ? t(lang,'prod_save') : t(lang,'prod_add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      </PullToRefresh>
      );
      }