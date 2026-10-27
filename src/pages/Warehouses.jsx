import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import WarehouseFormDialog from '@/components/warehouses/WarehouseFormDialog';
import WarehouseRegistry from '@/components/warehouses/WarehouseRegistry';
import WarehouseKpiRow from '@/components/warehouses/WarehouseKpiRow';
import WarehouseDetailPanel from '@/components/warehouses/WarehouseDetailPanel';
import AllWarehouseProductsTable from '@/components/warehouses/AllWarehouseProductsTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MoveProductsDialog from '@/components/warehouses/MoveProductsDialog';
import BulkEditProductsDialog from '@/components/warehouses/BulkEditProductsDialog';
import DeleteWarehouseDialog from '@/components/warehouses/DeleteWarehouseDialog';
import OrphanedProductsDialog from '@/components/products/OrphanedProductsDialog';
import DuplicateProductsDialog from '@/components/products/DuplicateProductsDialog';
import ProductSearchSummary from '@/components/warehouses/ProductSearchSummary';
import WarehouseProductFilters from '@/components/warehouses/WarehouseProductFilters';
import { duplicateKey } from '@/lib/productDuplicate';
import { WAREHOUSE_HERO, warehousePhoto } from '@/lib/warehousePhotos';
import {
  Plus,
  Warehouse as WarehouseIcon,
  Trash2,
  Home,
  Building,
  Store,
  Package,
  Loader2,
  ArrowRightLeft,
  Search,
  X as XIcon,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { parseISO, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import BrandedLoader from '@/components/ui/BrandedLoader';

const WAREHOUSE_ICONS = [
  { key: 'Warehouse', icon: WarehouseIcon, label: 'Склад' },
  { key: 'Home', icon: Home, label: 'Дом' },
  { key: 'Building', icon: Building, label: 'Здание' },
  { key: 'Store', icon: Store, label: 'Магазин' },
  { key: 'Package', icon: Package, label: 'Коробка' },
];

function WarehouseIconComp({ iconKey, className }) {
  const found = WAREHOUSE_ICONS.find(i => i.key === iconKey);
  const Icon = found ? found.icon : WarehouseIcon;
  return <Icon className={className} />;
}

export default function Warehouses() {
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [view, setView] = useState('grid');

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [mainSearch, setMainSearch] = useState(''); // поиск товара по всем складам
  const [hideSoldOut, setHideSoldOut] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [creators, setCreators] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchFullscreen, setGlobalSearchFullscreen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [moveSelectedOpen, setMoveSelectedOpen] = useState(false);
  const [deletingProducts, setDeletingProducts] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null); // { type: 'one'|'selected'|'warehouse'|'all', productId?, label }
  const [deleteWarehouseDialog, setDeleteWarehouseDialog] = useState(null); // warehouse object
  const [deletingWarehouse, setDeletingWarehouse] = useState(false);

  // При входе в раздел открыта витрина всех складов.
  // Конкретный склад раскрывается ниже витрины — нажатием на его карточку.

  useEffect(() => {
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  // При входе в раздел сначала всегда показываются все склады.
  // Конкретный склад восстанавливаем только при возврате из карточки товара.
  useEffect(() => {
    if (warehouses.length === 0) return;
    if (sessionStorage.getItem('wh_back') !== '1') return;
    sessionStorage.removeItem('wh_back');
    const warehouseId = new URLSearchParams(window.location.search).get('warehouseId');
    if (!warehouseId) return;
    const found = warehouses.find(w => w.id === warehouseId);
    if (found) setSelectedWarehouse(found);
  }, [warehouses]);

  // Данные выбранного склада открываются в отдельном окне поверх витрины.

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }

      if (biz) {
        setBusiness(biz);

        const [warehousesData, productsData, salesData] = await Promise.all([
          base44.entities.Warehouse.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Sale.filter({ business_id: biz.id })
        ]);

        setWarehouses(warehousesData);
        setProducts(productsData);
        setSales(salesData);
        setProductTypes([...new Set(productsData.map(p => p.product_type).filter(Boolean))].sort());
        base44.functions.invoke('getProductCreators', {})
          .then(res => setCreators(res.data?.creators || []))
          .catch(() => setCreators([]));
        }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (warehouse = null) => {
    setEditingWarehouse(warehouse);
    setDialogOpen(true);
  };

  const handleDeleteWarehouse = async () => {
    if (!deleteWarehouseDialog) return;
    setDeletingWarehouse(true);
    try {
      const user = await base44.auth.me();
      const wh = deleteWarehouseDialog;
      // Логируем удаление склада
      await Promise.all([
        base44.entities.Warehouse.delete(wh.id),
        base44.entities.ActivityLog.create({
          business_id: business.id,
          action_type: 'delete',
          entity_type: 'Warehouse',
          entity_id: wh.id,
          entity_data: wh,
          user_email: user.email,
          description: `Удалён склад: ${wh.name}`,
          is_restored: false,
        })
      ]);
      setDeleteWarehouseDialog(null);
      setSelectedWarehouse(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert('Ошибка при удалении склада');
    } finally {
      setDeletingWarehouse(false);
    }
  };

  // Получаем ID товаров которые НЕ продавались
  const getUnsoldProductIds = (productList) => {
    const soldProductIds = new Set(sales.map(s => s.product_id));
    return productList.filter(p => !soldProductIds.has(p.id)).map(p => p.id);
  };

  const handleDeleteProducts = async () => {
    if (!deleteConfirmDialog) return;
    setDeletingProducts(true);
    try {
      let idsToDelete = [];
      if (deleteConfirmDialog.type === 'one') {
        idsToDelete = [deleteConfirmDialog.productId];
      } else if (deleteConfirmDialog.type === 'selected') {
        idsToDelete = selectedProductIds;
      } else if (deleteConfirmDialog.type === 'warehouse') {
        const whProds = products.filter(p => p.warehouse_id === selectedWarehouse?.id);
        idsToDelete = getUnsoldProductIds(whProds);
      } else if (deleteConfirmDialog.type === 'all') {
        idsToDelete = getUnsoldProductIds(products);
      }

      // Логируем каждое удаление в ActivityLog
      const user = await base44.auth.me();
      const prodsToDelete = products.filter(p => idsToDelete.includes(p.id));
      await Promise.all([
        ...idsToDelete.map(id => base44.entities.Product.delete(id)),
        ...prodsToDelete.map(p =>
          base44.entities.ActivityLog.create({
            business_id: business.id,
            action_type: 'delete',
            entity_type: 'Product',
            entity_id: p.id,
            entity_data: p,
            user_email: user.email,
            description: `Удалён товар: ${p.brand} ${p.model} (со склада, непроданный)`,
            is_restored: false,
          })
        )
      ]);

      setSelectedProductIds([]);
      setSelectMode(false);
      setDeleteConfirmDialog(null);
      await loadData();
    } finally {
      setDeletingProducts(false);
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleMoveOrphaned = async () => {
    if (!orphanedTarget) return;
    setOrphanedSaving(true);
    try {
      await Promise.all(orphanedProducts.map(p =>
        base44.entities.Product.update(p.id, { warehouse_id: orphanedTarget })
      ));
      setOrphanedDialogOpen(false);
      setOrphanedTarget('');
      await loadData();
    } finally {
      setOrphanedSaving(false);
    }
  };

  const toggleSelectAll = () => {
    const unsoldIds = getUnsoldProductIds(warehouseProducts);
    const allSelected = unsoldIds.every(id => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !unsoldIds.includes(id)));
    } else {
      setSelectedProductIds(prev => [...new Set([...prev, ...unsoldIds])]);
    }
  };

  // Расчёты для каждого склада
  const getWarehouseStats = (warehouseId) => {
    const warehouseProducts = products.filter(p => p.warehouse_id === warehouseId);
    const warehouseSales = sales.filter(s => s.warehouse_id === warehouseId);

    const totalBoxes = warehouseProducts.reduce((sum, p) => sum + (p.boxes_in_stock || 0), 0);
    const totalValue = warehouseProducts.reduce((sum, p) => sum + ((p.boxes_in_stock || 0) * (p.sale_price || 0)), 0);
    const totalWholesaleValue = warehouseProducts.reduce((sum, p) => sum + ((p.boxes_in_stock || 0) * (p.purchase_price || 0)), 0);
    const soldBoxes = warehouseSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
    const revenue = warehouseSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    return { totalBoxes, totalValue, totalWholesaleValue, soldBoxes, revenue, productsCount: warehouseProducts.length };
  };

  const filteredWarehouses = warehouses.filter(wh =>
    wh.name?.toLowerCase().includes(search.toLowerCase()) ||
    wh.address?.toLowerCase().includes(search.toLowerCase())
  );

  // Товары без склада (склад был удалён)
  const warehouseIds = new Set(warehouses.map(w => w.id));
  const orphanedProducts = products.filter(p => p.warehouse_id && !warehouseIds.has(p.warehouse_id));
  const [orphanedDialogOpen, setOrphanedDialogOpen] = useState(false);
  const [orphanedTarget, setOrphanedTarget] = useState('');
  const [orphanedSaving, setOrphanedSaving] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // Найти группы дубликатов (бренд+модель+тип+цвет в ОДНОМ складе; товары в разных складах — не дубликаты)
  const duplicateGroups = (() => {
    const map = {};
    products.forEach(p => {
      const key = duplicateKey(p);
      if (!key.replace(/\|/g, '')) return;
      (map[key] = map[key] || []).push(p);
    });
    return Object.values(map).filter(g => g.length > 1);
  })();

  // Фильтр по дате добавления товара (created_date)
  const matchesDateFilter = (p) => {
    if (dateFilter === 'all') return true;
    if (!p.created_date) return false;
    const d = parseISO(p.created_date);
    if (dateFilter === 'today') return isToday(d);
    if (dateFilter === 'yesterday') return isYesterday(d);
    if (dateFilter === 'week') return isThisWeek(d, { weekStartsOn: 1 });
    if (dateFilter === 'month') return isThisMonth(d);
    if (dateFilter === 'year') return isThisYear(d);
    if (dateFilter === 'custom') {
      if (!customDateFrom) return true;
      const from = startOfDay(new Date(customDateFrom));
      const to = endOfDay(new Date(customDateTo || customDateFrom));
      return isWithinInterval(d, { start: from, end: to });
    }
    return true;
  };

  // Общий предикат по всем фильтрам (дата + сотрудник + тип + цена)
  const matchesAllFilters = (p) => {
    if (!matchesDateFilter(p)) return false;
    if (employeeFilter !== 'all' && p.created_by_id !== employeeFilter) return false;
    if (typeFilter !== 'all' && p.product_type !== typeFilter) return false;
    if (priceMin && (p.sale_price || 0) < Number(priceMin)) return false;
    if (priceMax && (p.sale_price || 0) > Number(priceMax)) return false;
    return true;
  };

  // Товары выбранного склада (со всеми фильтрами); распроданные скрываются по умолчанию
  const warehouseProducts = selectedWarehouse
     ? products.filter(p => {
          if (hideSoldOut && (p.boxes_in_stock || 0) === 0) return false;
          if (!matchesAllFilters(p)) return false;
          if (!productSearch) return p.warehouse_id === selectedWarehouse.id;
          const q = productSearch.toLowerCase();
          return p.warehouse_id === selectedWarehouse.id && (
            p.model?.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q) ||
            p.product_type?.toLowerCase().includes(q)
         );
      })
     : [];

  // Витрина всех складов: товары всех складов — поиск здесь идёт по всем складам сразу
  const allFilteredProducts = products.filter(p => {
    if (!matchesAllFilters(p)) return false;
    if (!mainSearch) return true;
    const q = mainSearch.toLowerCase();
    return (
      p.model?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.product_type?.toLowerCase().includes(q)
    );
  });

  // Область поиска товара: на витрине — все склады, внутри склада — только он
  const searchScopeProducts = selectedWarehouse
    ? products.filter(p => p.warehouse_id === selectedWarehouse.id)
    : products;

  // Найденные товары в текущей области поиска (для сообщения «Товары не найдены»)
  const searchScopeMatches = globalSearch.trim().length > 0
    ? (() => {
        const q = globalSearch.toLowerCase();
        return searchScopeProducts.filter(p =>
          p.model?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.product_type?.toLowerCase().includes(q)
        );
      })()
    : [];

  if (!isReady) return <BrandedLoader fullScreen message="Загрузка складов..." />;
  if (!can('view_warehouses')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <WarehouseIcon className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Нет доступа</h3>
            <p className="text-slate-600">У вас нет прав для просмотра складов.<br/>Обратитесь к владельцу бизнеса.</p>
          </div>
        </div>
      </div>
    );
  }
  if (loading) {
    return <BrandedLoader fullScreen message="Загрузка складов..." />;
  }

  // Массовые действия доступны, если есть право менять, перемещать или удалять товары
  const canBulk = can('edit_products') || can('move_products') || can('delete_products');
  const selectedProducts = warehouseProducts.filter(p => selectedProductIds.includes(p.id));

  // Итоги по всем складам для приборной полосы
  const kpiValues = {
    products: can('view_warehouse_quantities') ? products.length : '•••',
    boxes: can('view_warehouse_quantities') ? products.reduce((s, p) => s + (p.boxes_in_stock || 0), 0).toLocaleString() : '•••',
    wholesale: can('view_warehouse_value') ? products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.purchase_price || 0), 0).toLocaleString() : '•••••',
    retail: can('view_warehouse_value') ? products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.sale_price || 0), 0).toLocaleString() : '•••••',
    profit: can('view_warehouse_cost') ? `+${products.reduce((s, p) => s + (p.boxes_in_stock || 0) * ((p.sale_price || 0) - (p.purchase_price || 0)), 0).toLocaleString()}` : '•••••',
    revenue: can('view_warehouse_revenue') ? sales.filter(s => !s.is_cancelled).reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString() : '•••••',
  };

  const resetFilters = () => {
    setDateFilter('all'); setCustomDateFrom(''); setCustomDateTo('');
    setEmployeeFilter('all'); setTypeFilter('all'); setPriceMin(''); setPriceMax('');
  };

  // Фото склада для его экрана: тот же снимок, что и на карточке витрины
  const selectedIndex = warehouses.findIndex(w => w.id === selectedWarehouse?.id);

  return (
    <div className="sh-page">
      {/* Шапка раздела */}
      <div className="sh-hero">
        <img className="bg" src={WAREHOUSE_HERO} alt="" />
        <div className="sc" />
        <div className="in">
          <div>
            <h1>Склады</h1>
            <p className="sub sh-sub">{filteredWarehouses.length} склада</p>
          </div>
          <div className="acts">
            <button
              className="sh-btn"
              onClick={() => { setGlobalSearchOpen(true); setGlobalSearch(''); }}
            >
              <Search className="w-3.5 h-3.5" />
              {selectedWarehouse ? 'Поиск по складу' : 'Поиск по всем складам'}
            </button>
            <button className="sh-btn" onClick={() => setView('grid')}>Сетка</button>
            <button className="sh-btn" onClick={() => setView('list')}>Список</button>
            {can('manage_warehouses') && (
              <button className="sh-btn pri" onClick={() => handleOpenDialog()}>
                <Plus className="w-3.5 h-3.5" />
                Добавить склад
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Приборная полоса: итоги по всем складам */}
      <WarehouseKpiRow values={kpiValues} />

      <div className="sh-wrap">
        {/* Плашки-предупреждения */}
        {(orphanedProducts.length > 0 || duplicateGroups.length > 0) && (
          <div className="sh-bands">
            {orphanedProducts.length > 0 && (
              <div className="sh-band a">
                <div>
                  <p><strong>{orphanedProducts.length} товаров без склада</strong></p>
                  <p className="d">Склад был удалён. Переместите эти товары в другой склад или удалите их.</p>
                </div>
                <button className="sh-btn" onClick={() => setOrphanedDialogOpen(true)}>
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Переместить
                </button>
              </div>
            )}
            {duplicateGroups.length > 0 && (
              <div className="sh-band b">
                <div>
                  <p><strong>Найдены дубликаты: {duplicateGroups.length} групп товаров с одинаковым брендом, моделью, типом и цветом в одном складе</strong></p>
                  <p className="d">В системе есть товары с одинаковым названием. Рекомендуется удалить лишние записи.</p>
                </div>
                <button className="sh-btn dg" onClick={() => setDuplicateDialogOpen(true)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Исправить
                </button>
              </div>
            )}
          </div>
        )}

        {/* Глобальный поиск товара по складам */}
        {globalSearchOpen && (
          <div className={globalSearchFullscreen ? 'sh-fs fixed inset-0 z-[60] overflow-auto p-3 lg:p-6' : 'sh-block'}>
            <div className="sh-tbl">
              <div className="sh-tt">
                <div className="sh-srch" style={{ width: 'min(520px, 100%)' }}>
                  <Search className="w-4 h-4" />
                  <input
                    autoFocus
                    value={globalSearch}
                    onChange={e => setGlobalSearch(e.target.value)}
                    placeholder="Введите модель, бренд или тип товара..."
                  />
                </div>
                <span className="sh-sp" />
                <button
                  className="sh-btn"
                  onClick={() => setGlobalSearchFullscreen(v => !v)}
                  title={globalSearchFullscreen ? 'Свернуть' : 'Во весь экран'}
                >
                  {globalSearchFullscreen
                    ? <Minimize2 className="w-3.5 h-3.5" />
                    : <Maximize2 className="w-3.5 h-3.5" />}
                  {globalSearchFullscreen ? 'Свернуть' : 'Во весь экран'}
                </button>
                <button
                  className="sh-btn"
                  onClick={() => { setGlobalSearchOpen(false); setGlobalSearchFullscreen(false); }}
                >
                  <XIcon className="w-3.5 h-3.5" />
                  Закрыть
                </button>
              </div>

              {/* Область поиска: витрина — все склады, внутри склада — только он */}
              <div className="sh-fl">
                <span className="sh-cap">
                  {selectedWarehouse
                    ? `Поиск только по складу «${selectedWarehouse.name}»`
                    : 'Поиск по всем складам'}
                </span>
              </div>

              {globalSearch.trim().length > 0 && (
                searchScopeMatches.length === 0 ? (
                  <div className="sh-empty">Товары не найдены</div>
                ) : (
                  <div style={{ padding: '16px 20px' }}>
                    <ProductSearchSummary
                      query={globalSearch}
                      products={searchScopeProducts}
                      sales={sales}
                      warehouses={warehouses}
                      can={can}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Склады */}
        <div className="sh-sec">
          <h2>Склады</h2>
          <div className="sh-srch">
            <Search className="w-4 h-4" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск склада"
            />
          </div>
        </div>

        <WarehouseRegistry
          warehouses={filteredWarehouses}
          getStats={getWarehouseStats}
          selectedId={selectedWarehouse?.id}
          onSelect={setSelectedWarehouse}
          onEdit={handleOpenDialog}
          canEdit={can('manage_warehouses')}
          can={can}
          view={view}
          onCreate={() => handleOpenDialog()}
          canCreate={can('manage_warehouses')}
        />

        {/* Товары всех складов */}
        <div className="sh-block">
          <AllWarehouseProductsTable
            products={allFilteredProducts}
            warehouses={warehouses}
            creators={creators}
            can={can}
            onOpen={(p) => { window.location.href = createPageUrl('ProductDetail') + '?id=' + p.id; }}
            onReset={() => { resetFilters(); setMainSearch(''); }}
            filtersRow={
              <>
                <div className="sh-srch" style={{ width: 260 }}>
                  <Search className="w-4 h-4" />
                  <input
                    value={mainSearch}
                    onChange={e => setMainSearch(e.target.value)}
                    placeholder="Поиск товара по всем складам"
                  />
                  {mainSearch && (
                    <button onClick={() => setMainSearch('')} title="Очистить">
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <WarehouseProductFilters
                  dateFilter={dateFilter} setDateFilter={setDateFilter}
                  customDateFrom={customDateFrom} setCustomDateFrom={setCustomDateFrom}
                  customDateTo={customDateTo} setCustomDateTo={setCustomDateTo}
                  employeeFilter={employeeFilter} setEmployeeFilter={setEmployeeFilter}
                  creators={creators}
                  typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                  productTypes={productTypes}
                  priceMin={priceMin} setPriceMin={setPriceMin}
                  priceMax={priceMax} setPriceMax={setPriceMax}
                />
              </>
            }
          />
        </div>

        {/* Данные выбранного склада — в отдельном окне поверх витрины */}
        <Dialog open={!!selectedWarehouse} onOpenChange={(open) => !open && setSelectedWarehouse(null)}>
          <DialogContent className="sh-win tk-panel border tk-bline p-0 w-[96vw] max-w-6xl max-h-[92vh] overflow-y-auto">
            {selectedWarehouse && (
            <WarehouseDetailPanel
              warehouse={selectedWarehouse}
              stats={getWarehouseStats(selectedWarehouse.id)}
              rows={warehouseProducts}
              warehouseAll={products.filter(p => p.warehouse_id === selectedWarehouse.id)}
              sales={sales}
              business={business}
              can={can}
              canBulk={canBulk}
              IconComponent={WarehouseIconComp}
              photo={warehousePhoto(selectedIndex < 0 ? 0 : selectedIndex)}
              filters={{
                dateFilter, setDateFilter, customDateFrom, setCustomDateFrom, customDateTo, setCustomDateTo,
                employeeFilter, setEmployeeFilter, creators,
                typeFilter, setTypeFilter, productTypes,
                priceMin, setPriceMin, priceMax, setPriceMax,
              }}
              search={productSearch}
              setSearch={setProductSearch}
              hideSoldOut={hideSoldOut}
              setHideSoldOut={setHideSoldOut}
              selectMode={selectMode}
              setSelectMode={setSelectMode}
              selectedIds={selectedProductIds}
              toggleSelect={toggleSelectProduct}
              toggleAll={toggleSelectAll}
              unsoldIds={getUnsoldProductIds}
              onOpenProduct={(p) => {
                // Возврат из карточки товара вернёт в этот же склад
                sessionStorage.setItem('wh_back', '1');
                window.location.href = createPageUrl('ProductDetail') + '?id=' + p.id + '&from=' + encodeURIComponent(createPageUrl('Warehouses') + '?warehouseId=' + selectedWarehouse.id);
              }}
              onBack={() => setSelectedWarehouse(null)}
              onMove={() => setMoveDialogOpen(true)}
              onDeleteWarehouse={() => setDeleteWarehouseDialog(selectedWarehouse)}
              onDeleteProduct={(p) => setDeleteConfirmDialog({ type: 'one', productId: p.id, label: `«${p.brand} ${p.model}»` })}
              onDeleteUnsoldWarehouse={() => {
                const unsold = getUnsoldProductIds(products.filter(p => p.warehouse_id === selectedWarehouse.id));
                setDeleteConfirmDialog({ type: 'warehouse', label: `${unsold.length} непроданных товаров этого склада` });
              }}
              onDeleteUnsoldAll={() => {
                const unsold = getUnsoldProductIds(products);
                setDeleteConfirmDialog({ type: 'all', label: `${unsold.length} непроданных товаров всех складов` });
              }}
              onCreateBulkEdit={() => setBulkEditOpen(true)}
              onMoveSelected={() => setMoveSelectedOpen(true)}
              onDeleteSelected={() => setDeleteConfirmDialog({ type: 'selected', label: `${selectedProductIds.length} выбранных товаров` })}
              onClearSelection={() => setSelectedProductIds([])}
            />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Move Products Dialog */}
      {moveDialogOpen && selectedWarehouse && (
        <MoveProductsDialog
          products={warehouseProducts}
          warehouses={warehouses}
          currentWarehouse={selectedWarehouse}
          onClose={() => setMoveDialogOpen(false)}
          onMoved={loadData}
        />
      )}

      {/* Массовое изменение данных выбранных товаров */}
      {bulkEditOpen && (
        <BulkEditProductsDialog
          open={bulkEditOpen}
          onClose={() => setBulkEditOpen(false)}
          products={selectedProducts}
          business={business}
          warehouses={warehouses}
          onSaved={() => { loadData(); setSelectedProductIds([]); }}
        />
      )}

      {/* Перемещение только выбранных товаров */}
      {moveSelectedOpen && selectedWarehouse && (
        <MoveProductsDialog
          products={selectedProducts}
          warehouses={warehouses}
          currentWarehouse={selectedWarehouse}
          onClose={() => setMoveSelectedOpen(false)}
          onMoved={() => { loadData(); setSelectedProductIds([]); }}
        />
      )}

      {/* Delete Products Confirm Dialog */}
      <Dialog open={!!deleteConfirmDialog} onOpenChange={(open) => !open && setDeleteConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Подтвердите удаление
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-700">
              Будет удалено: <span className="font-semibold">{deleteConfirmDialog?.label}</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">
              ⚠️ Удаляются только товары, которые <strong>не участвовали в продажах</strong>. Это действие необратимо.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmDialog(null)}>Отмена</Button>
            <Button
              onClick={handleDeleteProducts}
              disabled={deletingProducts}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deletingProducts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orphaned Products Dialog */}
      <OrphanedProductsDialog
        open={orphanedDialogOpen}
        onClose={() => setOrphanedDialogOpen(false)}
        orphanedProducts={orphanedProducts}
        warehouses={warehouses}
        onSaved={loadData}
      />

      {/* Duplicate Products Dialog */}
      <DuplicateProductsDialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        duplicateGroups={duplicateGroups}
        onSaved={loadData}
      />

      {/* Delete Warehouse Dialog (multi-step) */}
      {deleteWarehouseDialog && (
        <DeleteWarehouseDialog
          warehouse={deleteWarehouseDialog}
          stats={getWarehouseStats(deleteWarehouseDialog.id)}
          onConfirm={handleDeleteWarehouse}
          onClose={() => setDeleteWarehouseDialog(null)}
          deleting={deletingWarehouse}
        />
      )}

      {/* Add/Edit Dialog */}
      <WarehouseFormDialog
        open={dialogOpen}
        warehouse={editingWarehouse}
        business={business}
        icons={WAREHOUSE_ICONS}
        onClose={() => setDialogOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}