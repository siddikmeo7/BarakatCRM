import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronRight,
  CheckSquare,
  Square,
  X,
  Tag,
  Warehouse,
  DollarSign,
  CheckCheck,
  Layers,
  PackageOpen,
  AlertCircle,
  Info,
  ChevronDown,
  Search
} from 'lucide-react';
import BulkAddProductsDialog from '@/components/products/BulkAddProductsDialog';
import OrphanedProductsDialog from '@/components/products/OrphanedProductsDialog';
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
  const savingRef = useRef(false); // защита от двойного сохранения
  const loadCalledRef = useRef(false); // защита от двойной загрузки данных
  const [duplicateProduct, setDuplicateProduct] = useState(null); // найденный дубликат
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

  // Режим выбора
  const [filterColor, setFilterColor] = useState('all');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [filterStock, setFilterStock] = useState('all');

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null); // 'brand'|'model'|'type'|'color'|'warehouse'|'sale_price'|'purchase_price'|'delete'
  const [bulkValue, setBulkValue] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [orphanedDialogOpen, setOrphanedDialogOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelPickerSearch, setModelPickerSearch] = useState('');

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    is_consignment: false,
    owner_name: '',
    owner_email: '',
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
    const doLoad = () => {
      if (loadCalledRef.current) return;
      loadCalledRef.current = true;
      loadData();
    };

    if (window.__barakatAccessReady) {
      doLoad();
      return;
    }
    const handler = () => doLoad();
    window.addEventListener('barakatAccessReady', handler);
    return () => window.removeEventListener('barakatAccessReady', handler);
  }, []);

  const loadData = async () => {
    try {
      const cachedBiz = window.__barakatBusiness;
      if (!cachedBiz) return;

      // Загружаем свежие данные бизнеса из БД, чтобы custom_pairs_per_box и другие поля были актуальны
      const [bizList, productsData, warehousesData] = await Promise.all([
        base44.entities.Business.filter({ id: cachedBiz.id }),
        base44.entities.Product.filter({ business_id: cachedBiz.id }),
        base44.entities.Warehouse.filter({ business_id: cachedBiz.id })
      ]);

      const biz = bizList[0] || cachedBiz;
      setBusiness(biz);
      setLang(biz.language || 'ru');

      // Загружаем товары на реализации отдельно — не должна ломать основной список
      let consignmentData = [];
      try {
        consignmentData = await base44.entities.ConsignmentProduct.filter({ business_id: cachedBiz.id });
      } catch (_) {}

      const mergedProducts = [
        ...productsData.map(p => ({ ...p, _isConsignment: false })),
        ...consignmentData.map(p => ({ ...p, _isConsignment: true, purchase_price: p.owner_price }))
      ];
      const uniqueProducts = [...new Map(mergedProducts.map(p => [p.id, p])).values()];
      setProducts(uniqueProducts);
      setWarehouses(warehousesData);

      setFormData(prev => ({
        ...prev,
        color: biz.default_color || 'Чёрный',
        size_from: biz.default_size_from || 39,
        size_to: biz.default_size_to || 44,
        pairs_per_box: biz.default_pairs_per_box || 6,
        product_type: biz.default_product_type || 'Туфли'
      }));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Проверка дубликата по бренду+модели
  const checkDuplicate = (brand, model) => {
    if (!brand.trim() || !model.trim()) {
      setDuplicateProduct(null);
      return;
    }
    const found = products.find(p =>
      p.brand?.toLowerCase().trim() === brand.toLowerCase().trim() &&
      p.model?.toLowerCase().trim() === model.toLowerCase().trim() &&
      (!editingProduct || p.id !== editingProduct.id)
    );
    setDuplicateProduct(found || null);
  };

  const handleOpenDialog = (product = null) => {
    setDuplicateProduct(null);
    if (product) {
      setEditingProduct(product);
      setFormData({
        brand: product.brand || '',
        model: product.model || '',
        is_consignment: product._isConsignment || false,
        owner_name: product.owner_name || '',
        owner_email: product.owner_email || '',
        product_type: product.product_type || 'Туфли',
        color: product.color || 'Чёрный',
        size_from: product.size_from || 39,
        size_to: product.size_to || 44,
        pairs_per_box: product.pairs_per_box || 6,
        purchase_price: product._isConsignment ? (product.owner_price || '') : (product.purchase_price || ''),
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
        is_consignment: false,
        owner_name: '',
        owner_email: '',
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
    if (savingRef.current) return; // Жёсткая защита от двойного нажатия
    savingRef.current = true;
    setSaving(true);
    // НЕ закрываем диалог сразу — это вызывало белый экран у сотрудников
    
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

    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      const emp = window.__barakatEmployee;

      // === Сохранение товара на реализации (чужой товар) ===
      if (formData.is_consignment) {
        const consignmentData = {
          business_id: business.id,
          owner_name: formData.owner_name || business?.default_consignment_owner || '',
          owner_email: formData.owner_email || business?.default_consignment_owner_email || '',
          seller_email: user.email,
          seller_name: emp?.name || user.full_name || user.email,
          brand: formData.brand,
          model: formData.model,
          product_type: formData.product_type,
          color: formData.color,
          size_from: parseInt(formData.size_from) || 39,
          size_to: parseInt(formData.size_to) || 44,
          pairs_per_box: parseInt(formData.pairs_per_box) || 6,
          photo_url: formData.photo_url,
          owner_price: parseFloat(formData.purchase_price) || 0,
          sale_price: parseFloat(formData.sale_price) || 0,
          boxes_in_stock: parseInt(formData.boxes_in_stock) || 0
        };
        if (editingProduct?._isConsignment) {
          await base44.entities.ConsignmentProduct.update(editingProduct.id, consignmentData);
          await base44.entities.ActivityLog.create({
            business_id: business.id, action_type: 'update', entity_type: 'ConsignmentProduct',
            entity_id: editingProduct.id, entity_data: consignmentData, user_email: user.email,
            description: `Обновлён товар на реализации: ${consignmentData.brand} ${consignmentData.model} (владелец: ${consignmentData.owner_name})`
          });
        } else {
          const created = await base44.entities.ConsignmentProduct.create(consignmentData);
          await base44.entities.ActivityLog.create({
            business_id: business.id, action_type: 'create', entity_type: 'ConsignmentProduct',
            entity_id: created.id, entity_data: consignmentData, user_email: user.email,
            description: `Добавлен товар на реализацию: ${consignmentData.brand} ${consignmentData.model} (${consignmentData.boxes_in_stock} кор., владелец: ${consignmentData.owner_name})`
          });
        }
        setDialogOpen(false);
        await loadData();
        return;
      }

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
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      setDialogOpen(false);
      await loadData();
    } finally {
      setSaving(false);
      savingRef.current = false;
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
        
        if (product._isConsignment) {
          await base44.entities.ConsignmentProduct.delete(productId);
        } else {
          await base44.entities.Product.delete(productId);
        }
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

  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const openBulkAction = (action) => {
    setBulkAction(action);
    setBulkValue('');
    setBulkDone(false);
    setBulkDialogOpen(true);
  };

  const handleBulkSave = async () => {
    setBulkSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));
      const ids = [...selectedIds];
      if (bulkAction === 'delete') {
        await Promise.all(ids.map(async id => {
          const product = products.find(p => p.id === id);
          const entity = product?._isConsignment ? base44.entities.ConsignmentProduct : base44.entities.Product;
          await entity.delete(id);
          await base44.entities.ActivityLog.create({
            business_id: business.id, action_type: 'delete', entity_type: product?._isConsignment ? 'ConsignmentProduct' : 'Product',
            entity_id: id, entity_data: product, user_email: user.email,
            description: `Удалён товар: ${product?.brand} ${product?.model}`
          });
        }));
      } else {
        const fieldMap = {
          brand: 'brand', model: 'model', type: 'product_type', color: 'color',
          warehouse: 'warehouse_id', sale_price: 'sale_price', purchase_price: 'purchase_price'
        };
        const field = fieldMap[bulkAction];
        const val = (bulkAction === 'sale_price' || bulkAction === 'purchase_price')
          ? parseFloat(bulkValue) || 0
          : bulkValue;
        await Promise.all(ids.map(async id => {
          const product = products.find(p => p.id === id);
          const entity = product?._isConsignment ? base44.entities.ConsignmentProduct : base44.entities.Product;
          const updateField = (product?._isConsignment && field === 'purchase_price') ? 'owner_price' : field;
          await entity.update(id, { [updateField]: val });
        }));
        await base44.entities.ActivityLog.create({
          business_id: business.id, action_type: 'update', entity_type: 'Product',
          entity_id: ids[0], entity_data: { ids, field, value: val }, user_email: user.email,
          description: `Массовое изменение ${ids.length} товаров: ${field} = ${val}`
        });
      }
      await loadData();
      setBulkDone(true);
      setTimeout(() => {
        setBulkDone(false);
        setBulkDialogOpen(false);
        setSelectedIds(new Set());
        setSelectMode(false);
      }, 1200);
    } catch (e) { console.error(e); }
    finally { setBulkSaving(false); }
  };

  // Все типы и цвета (базовые + кастомные)
  const allProductTypes = [...BASE_PRODUCT_TYPES, ...(business?.custom_product_types || [])];
  const allColors = [...BASE_COLORS, ...(business?.custom_colors || [])];
  const lowStockLimit = business?.low_stock_limit ?? 2;

  // Уникальные бренды из всех существующих товаров
  const existingBrands = useMemo(() => {
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
    if (!modelPickerSearch.trim()) return brands;
    return brands.filter(b => b.toLowerCase().includes(modelPickerSearch.toLowerCase().trim()));
  }, [products, modelPickerSearch]);

  // Фильтрация (скрываем товары с нулевым остатком по умолчанию, если не выбран фильтр "empty")
  let filteredProducts = products.filter(product => {
    if (filterStock !== 'empty') {
      if ((product.boxes_in_stock || 0) === 0) return false;
    }
    const q = search.toLowerCase().trim();
    const fullName = `${product.brand || ''} ${product.model || ''}`.toLowerCase();
    const matchesSearch = !q ||
      fullName.includes(q) ||
      product.brand?.toLowerCase().includes(q) ||
      product.model?.toLowerCase().includes(q) ||
      product.color?.toLowerCase().includes(q) ||
      product.product_type?.toLowerCase().includes(q);
    const matchesType = filterType === 'all' || product.product_type === filterType;
    const matchesWarehouse = filterWarehouse === 'all' || product.warehouse_id === filterWarehouse;
    const matchesColor = !filterColor || filterColor === 'all' || product.color === filterColor;
    const matchesPriceMin = !filterPriceMin || (product.sale_price || 0) >= parseFloat(filterPriceMin);
    const matchesPriceMax = !filterPriceMax || (product.sale_price || 0) <= parseFloat(filterPriceMax);
    const matchesStock = filterStock === 'all' ||
      (filterStock === 'low' && (product.boxes_in_stock || 0) <= lowStockLimit) ||
      (filterStock === 'instock' && (product.boxes_in_stock || 0) > 0) ||
      (filterStock === 'empty' && (product.boxes_in_stock || 0) === 0);
    return matchesSearch && matchesType && matchesWarehouse && matchesColor && matchesPriceMin && matchesPriceMax && matchesStock;
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

  // Товары без склада (склад был удалён)
  const warehouseIds = new Set(warehouses.map(w => w.id));
  const orphanedProducts = products.filter(p => p.warehouse_id && !warehouseIds.has(p.warehouse_id));

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
    <PullToRefresh onRefresh={() => { loadCalledRef.current = false; return loadData(); }}>
    <div className="space-y-6">
      <PageHeader 
        title={t(lang,'prod_title')}
        subtitle={`${products.length} ${t(lang,'prod_subtitle_count')} ${can('view_stock_value') ? `${totalStockValue.toLocaleString()} ${t(lang,'dash_somoni')}` : ''}`}
        actions={
          can('add_products') && (
            <div className="flex gap-2">
              <Button onClick={() => setBulkAddOpen(true)} variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Много товаров</span>
              </Button>
              <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Plus className="w-4 h-4" />
                {t(lang,'prod_add')}
              </Button>
            </div>
          )
        }
      />

      {/* Orphaned products banner — перенесён в раздел Склады */}

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
          {(filterColor !== 'all' || filterStock !== 'all' || filterPriceMin || filterPriceMax) && (
            <button
              onClick={() => { setFilterColor('all'); setFilterStock('all'); setFilterPriceMin(''); setFilterPriceMax(''); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium"
            >
              <X className="w-3 h-3" /> Сбросить
            </button>
          )}
          <button
            onClick={toggleSelectMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}
          >
            <CheckSquare className="w-3 h-3" />
            <span>Выбрать</span>
          </button>
          </div>
        </div>
        {/* Дополнительные фильтры */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <Select value={filterColor} onValueChange={v => { setFilterColor(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Цвет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все цвета</SelectItem>
              {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStock} onValueChange={v => { setFilterStock(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Остаток" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все остатки</SelectItem>
              <SelectItem value="instock">В наличии</SelectItem>
              <SelectItem value="low">⚠️ Мало</SelectItem>
              <SelectItem value="empty">Нет в наличии</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={filterPriceMin}
              onChange={e => { setFilterPriceMin(e.target.value.replace(/[^0-9]/g, '')); setPage(1); }}
              placeholder="Цена от"
              className="h-8 text-xs w-20"
            />
            <span className="text-xs text-slate-400">—</span>
            <Input
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={filterPriceMax}
              onChange={e => { setFilterPriceMax(e.target.value.replace(/[^0-9]/g, '')); setPage(1); }}
              placeholder="до"
              className="h-8 text-xs w-20"
            />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="bg-indigo-600 text-white rounded-2xl p-3 shadow-lg flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <button onClick={selectAll} className="text-xs underline opacity-80 hover:opacity-100">Все</button>
            <button onClick={deselectAll} className="text-xs underline opacity-80 hover:opacity-100">Снять</button>
            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{selectedIds.size} выбрано</span>
          </div>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {can('edit_products') && (<>
              <button onClick={() => openBulkAction('brand')} className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-all">✏️ Бренд</button>
              <button onClick={() => openBulkAction('model')} className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-all">✏️ Модель</button>
              <button onClick={() => openBulkAction('type')} className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-all">🏷️ Тип</button>
              <button onClick={() => openBulkAction('color')} className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-all">🎨 Цвет</button>
              <button onClick={() => openBulkAction('warehouse')} className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-all">🏭 Склад</button>
              <button onClick={() => openBulkAction('sale_price')} className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-all">💰 Цена прод.</button>
              {can('view_purchase_price') && <button onClick={() => openBulkAction('purchase_price')} className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-all">💳 Цена заку.</button>}
            </>)}
            {can('delete_products') && (
              <button onClick={() => openBulkAction('delete')} disabled={selectedIds.size === 0} className="px-2.5 py-1 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-all disabled:opacity-40">🗑️ Удалить</button>
            )}
          </div>
          <button onClick={toggleSelectMode} className="p-1.5 hover:bg-white/20 rounded-lg transition-all ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              <div key={product.id} onClick={() => selectMode && toggleSelect(product.id)}
                className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${isLowStock ? 'border-red-300 bg-red-50' : 'border-slate-100 shadow-sm'} ${selectMode && selectedIds.has(product.id) ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className={`flex items-center justify-between px-3 pt-2.5 pb-1 ${isLowStock ? 'border-b border-red-200' : 'border-b border-slate-100'}`}>
                  <div className="min-w-0 flex-1 flex items-start gap-1">
                  {selectMode && (
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${selectedIds.has(product.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                      {selectedIds.has(product.id) && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono text-slate-300 select-none">{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <p className={`font-bold text-sm truncate ${isLowStock ? 'text-red-700' : 'text-slate-900'}`}>{product.brand}</p>
                      {product._isConsignment && <span className="text-[8px] font-bold bg-teal-100 text-teal-700 px-1 py-0.5 rounded flex-shrink-0">РЕАЛИЗ.</span>}
                    </div>
                    <p className={`text-xs truncate ${isLowStock ? 'text-red-500' : 'text-slate-500'}`}>{product.model}</p>
                    </div>
                    </div>
                    {!selectMode && <div className="flex gap-1 ml-1 flex-shrink-0">
                    {can('edit_products') && (
                      <button onClick={(e) => { e.stopPropagation(); handleOpenDialog(product); }} className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200">
                        <Edit2 className="w-3 h-3 text-slate-600" />
                      </button>
                    )}
                    {can('delete_products') && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="p-1 bg-slate-100 rounded-lg hover:bg-red-100">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    )}
                    </div>}
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
                onClick={() => selectMode ? toggleSelect(product.id) : handleOpenDialog(product)}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${isLowStock ? 'border-red-400 animate-pulse-border' : 'border-slate-100'} ${selectMode && selectedIds.has(product.id) ? 'ring-2 ring-indigo-500' : ''}`}>
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
                  {selectMode ? (
                    <div className={`absolute top-1 right-1 w-5 h-5 rounded border-2 flex items-center justify-center ${selectedIds.has(product.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {selectedIds.has(product.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  ) : can('delete_products') && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="absolute top-1 right-1 p-1 bg-white rounded-lg shadow hover:bg-red-50">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  )}
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-1">
                    <p className={`font-semibold text-xs truncate ${isLowStock ? 'text-red-700' : 'text-slate-900'}`}>{product.brand}</p>
                    {product._isConsignment && <span className="text-[8px] font-bold bg-teal-100 text-teal-700 px-1 py-0.5 rounded flex-shrink-0">РЕАЛИЗ.</span>}
                  </div>
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
                    onClick={() => selectMode ? toggleSelect(product.id) : setExpandedRow(isExpanded ? null : product.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isLowStock ? 'bg-red-50' : 'hover:bg-slate-50'} ${selectMode && selectedIds.has(product.id) ? 'bg-indigo-50' : ''}`}>
                    {selectMode && (
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${selectedIds.has(product.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                        {selectedIds.has(product.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    )}
                    {product.photo_url ? (
                      <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className={`text-sm font-semibold truncate ${isLowStock ? 'text-red-700' : 'text-slate-900'}`}>{product.brand} {product.model}</p>
                        {product._isConsignment && <span className="text-[8px] font-bold bg-teal-100 text-teal-700 px-1 py-0.5 rounded flex-shrink-0">РЕАЛИЗ.</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{product.product_type} · {product.color}{product._isConsignment && product.owner_name ? ` · 👤 ${product.owner_name}` : ''}</p>
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
                        <div className={`rounded-xl p-2 border ${product.warehouse_id && !warehouse ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
                          <p className="text-slate-400">Склад</p>
                          <p className={`font-semibold truncate ${product.warehouse_id && !warehouse ? 'text-amber-600' : 'text-slate-800'}`}>
                            {warehouse?.name || (product.warehouse_id ? '⚠️ Удалён' : '—')}
                          </p>
                        </div>
                        {can('view_purchase_price') && (
                          <div className="bg-white rounded-xl p-2 border border-slate-100">
                            <p className="text-slate-400">Закупка / кор.</p>
                            <p className="font-semibold text-slate-800">{product.purchase_price?.toLocaleString()} с.</p>
                          </div>
                        )}
                        {can('view_stock_value') && (
                          <div className="bg-white rounded-xl p-2 border border-slate-100">
                            <p className="text-slate-400">Стоимость склада</p>
                            <p className="font-semibold text-emerald-600">{stockValue.toLocaleString()} с.</p>
                          </div>
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

            {/* Consignment toggle */}
            <div
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${formData.is_consignment ? 'bg-teal-50 border-teal-300' : 'bg-slate-50 border-transparent hover:border-slate-200'} ${editingProduct ? 'opacity-70 cursor-default' : ''}`}
              onClick={() => { if (!editingProduct) setFormData({ ...formData, is_consignment: !formData.is_consignment }); }}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${formData.is_consignment ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>
                {formData.is_consignment && <CheckCheck className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">Не мой товар (реализация)</p>
                <p className="text-xs text-slate-500">Товар принадлежит другому человеку — вы продаёте его и оставляете прибыль себе</p>
              </div>
              {formData.is_consignment && <PackageOpen className="w-5 h-5 text-teal-500 flex-shrink-0" />}
            </div>

            {/* Owner fields when consignment */}
            {formData.is_consignment && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-teal-50 rounded-xl">
                <div>
                  <Label>Имя владельца *</Label>
                  <Input
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="Имя владельца товара"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Email владельца</Label>
                  <Input
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    placeholder="email@example.com"
                    className="mt-1.5"
                  />
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
              <div className="relative">
                <Label>{t(lang,'prod_brand')} *</Label>
                <div className="flex gap-1.5 mt-1.5">
                  <Input 
                    value={formData.brand}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, brand: val });
                      checkDuplicate(val, formData.model);
                      setModelPickerOpen(true);
                      setModelPickerSearch(val);
                    }}
                    onFocus={() => { setModelPickerOpen(true); setModelPickerSearch(formData.brand); }}
                    onBlur={() => setTimeout(() => setModelPickerOpen(false), 150)}
                    placeholder="Nike, Adidas..."
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setModelPickerOpen(v => !v); setModelPickerSearch(''); }}
                    className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-xs text-slate-600 hover:text-indigo-700 transition-colors flex-shrink-0"
                    title="Выбрать из существующих брендов"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                {modelPickerOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg">
                        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input
                          value={modelPickerSearch}
                          onChange={e => setModelPickerSearch(e.target.value)}
                          placeholder="Поиск бренда..."
                          className="flex-1 bg-transparent text-xs outline-none text-slate-700 placeholder:text-slate-400"
                        />
                        {modelPickerSearch && (
                          <button onMouseDown={e => e.preventDefault()} onClick={() => setModelPickerSearch('')} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {existingBrands.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Нет совпадений</p>
                      ) : (
                        existingBrands.map(brand => (
                          <button
                            key={brand}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, brand }));
                              checkDuplicate(brand, formData.model);
                              setModelPickerOpen(false);
                              setModelPickerSearch('');
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            {brand}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>{t(lang,'prod_model')} *</Label>
                <Input 
                  value={formData.model}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, model: val });
                    checkDuplicate(formData.brand, val);
                  }}
                  placeholder="Air Max, Ultra Boost..."
                  className={`mt-1.5 ${duplicateProduct && !editingProduct ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                />
              </div>
            </div>

            {/* Предупреждение о дубликате */}
            {duplicateProduct && !editingProduct && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded-xl animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    Такой товар уже существует!
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    <span className="font-medium">{duplicateProduct.brand} {duplicateProduct.model}</span> уже добавлен в систему
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white rounded-lg p-2 border border-amber-200">
                      <p className="text-amber-500">Добавлен</p>
                      <p className="font-semibold text-slate-800">
                        {duplicateProduct.created_date ? format(parseISO(duplicateProduct.created_date), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—'}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-amber-200">
                      <p className="text-amber-500">Коробок</p>
                      <p className="font-semibold text-slate-800">{duplicateProduct.boxes_in_stock || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-amber-200">
                      <p className="text-amber-500">Цена</p>
                      <p className="font-semibold text-slate-800">{duplicateProduct.sale_price?.toLocaleString()} с.</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setDialogOpen(false); setDuplicateProduct(null); setTimeout(() => handleOpenDialog(duplicateProduct), 100); }}
                      className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Открыть существующий
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateProduct(null)}
                      className="text-xs px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition-colors"
                    >
                      Всё равно добавить
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                    {[4, 6, 8, ...(business?.custom_pairs_per_box || [])].sort((a, b) => a - b).map(v => (
                      <SelectItem key={v} value={String(v)}>
                        {v} пар в коробке
                        {formData.sale_price ? ` — ${(parseFloat(formData.sale_price) / v).toFixed(1)} с./пара` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.sale_price && formData.pairs_per_box && (
                  <div className="mt-1.5 flex gap-3 text-xs text-slate-500">
                    <span>1 пара = <strong className="text-indigo-600">{(parseFloat(formData.sale_price) / formData.pairs_per_box).toFixed(1)} с.</strong></span>
                    <span>1 штук = <strong className="text-indigo-600">{(parseFloat(formData.sale_price) / formData.pairs_per_box / 2).toFixed(1)} с.</strong></span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {(can('view_purchase_price') || can('edit_product_purchase_price') || formData.is_consignment) && (
              <div>
                <Label>{formData.is_consignment ? 'Цена владельца за кор.' : t(lang,'prod_purchase_price')} *</Label>
                <Input 
                  type="text"
                  pattern="[0-9.]*"
                  inputMode="decimal"
                  value={formData.purchase_price}
                  onChange={(e) => {
                    if (!can('edit_product_purchase_price') && !can('edit_products')) return;
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, purchase_price: val });
                  }}
                  readOnly={!can('edit_product_purchase_price') && !can('edit_products')}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              )}
              <div>
                <Label>{t(lang,'prod_sale_price')} *</Label>
                <Input 
                  type="text"
                  pattern="[0-9.]*"
                  inputMode="decimal"
                  value={formData.sale_price}
                  onChange={(e) => {
                    if (!can('edit_product_sale_price') && !can('edit_products')) return;
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, sale_price: val });
                  }}
                  readOnly={!can('edit_product_sale_price') && !can('edit_products')}
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
              disabled={savingRef.current || !formData.brand || !formData.model || (!!duplicateProduct && !editingProduct) || (formData.is_consignment && !formData.owner_name)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProduct ? t(lang,'prod_save') : t(lang,'prod_add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Products Dialog */}
      <BulkAddProductsDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        business={business}
        warehouses={warehouses}
        onSaved={loadData}
      />

      {/* Orphaned Products Dialog */}
      <OrphanedProductsDialog
        open={orphanedDialogOpen}
        onClose={() => setOrphanedDialogOpen(false)}
        orphanedProducts={orphanedProducts}
        warehouses={warehouses}
        onSaved={loadData}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'delete' ? `Удалить ${selectedIds.size} товаров` :
               bulkAction === 'brand' ? 'Изменить бренд' :
               bulkAction === 'model' ? 'Изменить модель' :
               bulkAction === 'type' ? 'Изменить тип товара' :
               bulkAction === 'color' ? 'Изменить цвет' :
               bulkAction === 'warehouse' ? 'Переместить на склад' :
               bulkAction === 'sale_price' ? 'Изменить цену продажи' :
               bulkAction === 'purchase_price' ? 'Изменить цену закупки' : ''}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mb-4">Изменение применится к <b>{selectedIds.size}</b> выбранным товарам</p>

          {bulkAction === 'delete' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              ⚠️ Это действие нельзя отменить. Все {selectedIds.size} товаров будут удалены безвозвратно.
            </div>
          )}
          {(bulkAction === 'brand' || bulkAction === 'model') && (
            <Input value={bulkValue} onChange={e => setBulkValue(e.target.value)}
              placeholder={bulkAction === 'brand' ? 'Новый бренд...' : 'Новая модель...'}
              className="mb-2" autoFocus />
          )}
          {bulkAction === 'type' && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger><SelectValue placeholder="Выберите тип..." /></SelectTrigger>
              <SelectContent>
                {allProductTypes.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {bulkAction === 'color' && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger><SelectValue placeholder="Выберите цвет..." /></SelectTrigger>
              <SelectContent>
                {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {bulkAction === 'warehouse' && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger><SelectValue placeholder="Выберите склад..." /></SelectTrigger>
              <SelectContent>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {(bulkAction === 'sale_price' || bulkAction === 'purchase_price') && (
            <Input type="text" inputMode="decimal" pattern="[0-9.]*"
              value={bulkValue} onChange={e => setBulkValue(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0" className="mb-2" autoFocus />
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setBulkDialogOpen(false)} disabled={bulkSaving || bulkDone}>Отмена</Button>
            <Button
              onClick={handleBulkSave}
              disabled={bulkSaving || bulkDone || (bulkAction !== 'delete' && !bulkValue) || selectedIds.size === 0}
              className={`flex-1 transition-all ${bulkDone ? 'bg-emerald-600 hover:bg-emerald-600' : bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               bulkDone ? <><CheckCheck className="w-4 h-4" /> Подтверждено!</> :
               bulkAction === 'delete' ? <><Trash2 className="w-4 h-4" /> Удалить {selectedIds.size}</> :
               <><CheckCheck className="w-4 h-4" /> Применить к {selectedIds.size}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
      </PullToRefresh>
      );
      }