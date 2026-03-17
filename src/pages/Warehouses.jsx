import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MoveProductsDialog from '@/components/warehouses/MoveProductsDialog';
import { 
  Plus, 
  Warehouse as WarehouseIcon, 
  Edit2, 
  Trash2, 
  MapPin,
  Package,
  Box,
  Home,
  Building,
  Store,
  Loader2,
  ChevronRight,
  ArrowRightLeft,
  Grid3x3,
  List,
  Calendar,
  Search,
  X as XIcon,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ViewToggle from '@/components/ui/ViewToggle';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';

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
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [view, setView] = useState('grid');
  
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [deletingProducts, setDeletingProducts] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null); // { type: 'one'|'selected'|'warehouse'|'all', productId?, label }
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    manager_email: '',
    icon: 'Warehouse'
  });

  useEffect(() => {
    loadData();
  }, []);

  // При возврате с страницы товара — восстановить выбранный склад
  useEffect(() => {
    if (warehouses.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const warehouseId = urlParams.get('warehouseId');
    if (warehouseId) {
      const found = warehouses.find(w => w.id === warehouseId);
      if (found) setSelectedWarehouse(found);
    }
  }, [warehouses]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      let biz = null;
      const savedMode = localStorage.getItem('barakatcrm_mode') || sessionStorage.getItem('barakatcrm_mode');
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
        
        const [warehousesData, productsData, salesData] = await Promise.all([
          base44.entities.Warehouse.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Sale.filter({ business_id: biz.id })
        ]);
        
        setWarehouses(warehousesData);
        setProducts(productsData);
        setSales(salesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name || '',
        address: warehouse.address || '',
        manager_email: warehouse.manager_email || '',
        icon: warehouse.icon || 'Warehouse'
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ name: '', address: '', manager_email: '', icon: 'Warehouse' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...formData, business_id: business.id };
      
      if (editingWarehouse) {
        await base44.entities.Warehouse.update(editingWarehouse.id, data);
      } else {
        await base44.entities.Warehouse.create(data);
      }
      
      await loadData();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving warehouse:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warehouseId) => {
    if (confirm('Удалить этот склад?')) {
      await base44.entities.Warehouse.delete(warehouseId);
      await loadData();
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
      await Promise.all(idsToDelete.map(id => base44.entities.Product.delete(id)));
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

  const toggleSelectAll = () => {
    const visibleIds = warehouseProducts.map(p => p.id);
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

  // Товары выбранного склада (с фильтрацией по модели)
  const warehouseProducts = selectedWarehouse 
    ? products.filter(p => {
        if (!productSearch) return p.warehouse_id === selectedWarehouse.id;
        const q = productSearch.toLowerCase();
        return p.warehouse_id === selectedWarehouse.id && (
          p.model?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.product_type?.toLowerCase().includes(q)
        );
      })
    : [];

  // Глобальный поиск: найти товар по всем складам
  const globalSearchResults = globalSearch.trim().length > 0
    ? (() => {
        const q = globalSearch.toLowerCase();
        const matched = products.filter(p =>
          p.model?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.product_type?.toLowerCase().includes(q)
        );
        // Группируем по складу
        const byWarehouse = {};
        matched.forEach(p => {
          const wh = warehouses.find(w => w.id === p.warehouse_id);
          const key = wh?.id || 'unknown';
          if (!byWarehouse[key]) byWarehouse[key] = { warehouse: wh, products: [] };
          byWarehouse[key].products.push(p);
        });
        return Object.values(byWarehouse);
      })()
    : [];

  if (!isReady) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
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
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Склады"
        subtitle={`${warehouses.length} складов`}
        actions={
          can('manage_warehouses') && (
            <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              Добавить склад
            </Button>
          )
        }
      />

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Поиск склада..."
            className="max-w-md"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => { setGlobalSearchOpen(true); setGlobalSearch(''); }}
            >
              <Search className="w-4 h-4" />
              Поиск товара
            </Button>
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>
      </div>

      {/* Глобальный поиск товара по складам */}
      {globalSearchOpen && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <input
              autoFocus
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Введите модель, бренд или тип товара..."
              className="flex-1 outline-none text-slate-800 placeholder-slate-400 text-sm"
            />
            <button onClick={() => setGlobalSearchOpen(false)}>
              <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
          {globalSearch.trim().length > 0 && (
            globalSearchResults.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Товары не найдены</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {/* Итого по всем складам */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                  <span className="font-bold text-indigo-800 text-sm">📦 Итого по всем складам</span>
                  <span className="font-bold text-indigo-700 text-xl">
                    {globalSearchResults.reduce((total, { products: whProds }) =>
                      total + whProds.reduce((s, p) => s + (p.boxes_in_stock || 0), 0), 0)} кор.
                  </span>
                </div>

                {globalSearchResults.map(({ warehouse, products: whProds }) => (
                  <div key={warehouse?.id || 'unknown'} className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 flex items-center gap-2">
                      <WarehouseIconComp iconKey={warehouse?.icon} className="w-4 h-4 text-purple-600" />
                      <span className="font-semibold text-slate-700 text-sm">{warehouse?.name || 'Неизвестный склад'}</span>
                      <span className="ml-auto text-xs font-semibold text-purple-600">{whProds.reduce((s, p) => s + (p.boxes_in_stock || 0), 0)} кор.</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {whProds.map((p, i) => (
                        <div
                          key={p.id}
                          className={`px-4 py-2.5 flex items-center justify-between transition-colors ${
                            i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                          } hover:bg-indigo-50 cursor-pointer group`}
                          onClick={() => window.location.href = createPageUrl('ProductDetail') + '?id=' + p.id}
                        >
                          <div>
                            <span className="font-semibold text-slate-900 text-sm group-hover:text-indigo-700">{p.brand} {p.model}</span>
                            <span className="ml-2 text-xs text-slate-400">{p.color} • {p.product_type}</span>
                          </div>
                          <span className={`font-bold text-sm px-3 py-1 rounded-full ${
                            (p.boxes_in_stock || 0) === 0
                              ? 'bg-red-100 text-red-600'
                              : (p.boxes_in_stock || 0) <= 3
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {p.boxes_in_stock || 0} кор.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Warehouses View */}
      {!selectedWarehouse && view === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map(warehouse => {
            const stats = getWarehouseStats(warehouse.id);
            
            return (
              <div 
                key={warehouse.id} 
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedWarehouse(warehouse)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <WarehouseIconComp iconKey={warehouse.icon} className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex gap-1">
                      {can('manage_warehouses') && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenDialog(warehouse); }}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(warehouse.id); }}
                            className="p-2 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{warehouse.name}</h3>
                   {warehouse.address && (
                     <p className="text-sm text-slate-500 flex items-center gap-1 mb-2">
                       <MapPin className="w-4 h-4" />
                       {warehouse.address}
                     </p>
                   )}
                   <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
                     <Calendar className="w-3 h-3" />
                     {warehouse.created_date ? format(parseISO(warehouse.created_date), 'dd MMM yyyy') : ''}
                   </p>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stats.totalBoxes}</p>
                      <p className="text-xs text-slate-500">коробок</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">{can('view_stock_value') ? stats.totalWholesaleValue.toLocaleString() : '•••••'}</p>
                      <p className="text-xs text-slate-500">опт. стоимость</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{can('view_stock_value') ? stats.totalValue.toLocaleString() : '•••••'}</p>
                      <p className="text-xs text-slate-500">розн. стоимость</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700">{stats.productsCount}</p>
                      <p className="text-xs text-slate-500">товаров</p>
                    </div>
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = createPageUrl('WarehouseSalesHistory') + '?id=' + warehouse.id;
                        }}
                        className="text-left p-2 hover:bg-blue-50 rounded-lg transition-colors -m-2"
                      >
                        <p className="text-lg font-semibold text-blue-600">{stats.soldBoxes}</p>
                        <p className="text-xs text-blue-500 underline">продано →</p>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-sm text-indigo-600 font-medium">Открыть склад</span>
                    <ChevronRight className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          ) : !selectedWarehouse && view === 'list' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-96">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Склад</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Товаров</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Коробок</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Стоимость</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Продано</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWarehouses.map(warehouse => {
                const stats = getWarehouseStats(warehouse.id);
                return (
                  <tr key={warehouse.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedWarehouse(warehouse)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <WarehouseIconComp iconKey={warehouse.icon} className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                           <p className="font-medium text-slate-900">{warehouse.name}</p>
                           {warehouse.address && <p className="text-xs text-slate-500">{warehouse.address}</p>}
                           <p className="text-[11px] text-slate-400 mt-0.5">
                             {warehouse.created_date ? format(parseISO(warehouse.created_date), 'dd MMM yyyy') : ''}
                           </p>
                         </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{stats.productsCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-600">{stats.totalBoxes}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{can('view_stock_value') ? `${stats.totalValue.toLocaleString()} с.` : '••••• с.'}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-semibold">{stats.soldBoxes}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                       {can('manage_warehouses') && (
                         <>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleOpenDialog(warehouse); }}
                             className="p-1.5 hover:bg-slate-100 rounded-lg"
                           >
                             <Edit2 className="w-4 h-4 text-slate-500" />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDelete(warehouse.id); }}
                             className="p-1.5 hover:bg-red-50 rounded-lg"
                           >
                             <Trash2 className="w-4 h-4 text-red-500" />
                           </button>
                         </>
                       )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
            </div>
            </div>
            ) : (
          /* Warehouse Details */
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setSelectedWarehouse(null)}>← Назад</Button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <WarehouseIconComp iconKey={selectedWarehouse.icon} className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-slate-900">{selectedWarehouse.name}</h2>
                   {selectedWarehouse.address && <p className="text-sm text-slate-500">{selectedWarehouse.address}</p>}
                   <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                     <Calendar className="w-3 h-3" />
                     {selectedWarehouse.created_date ? format(parseISO(selectedWarehouse.created_date), 'dd MMM yyyy') : ''}
                   </p>
                </div>
              </div>
            </div>
            {can('move_products') && (
              <Button
                onClick={() => setMoveDialogOpen(true)}
                variant="outline"
                className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Переместить товары
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {(() => {
              const stats = getWarehouseStats(selectedWarehouse.id);
              return (
                <>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Товаров</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.productsCount}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Коробок</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalBoxes}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Опт. стоимость</p>
                    <p className="text-2xl font-bold text-orange-600">{can('view_stock_value') ? `${stats.totalWholesaleValue.toLocaleString()} с.` : '••••• с.'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Розн. стоимость</p>
                    <p className="text-2xl font-bold text-emerald-600">{can('view_stock_value') ? `${stats.totalValue.toLocaleString()} с.` : '••••• с.'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Продано</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.soldBoxes} коробок</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Товары на складе</h3>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Фильтр по модели..."
                  className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                />
                {productSearch && (
                  <button onClick={() => setProductSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <XIcon className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-96">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Товар</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Коробок</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Пар</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Штук</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Оптовая стоимость</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Потенц. прибыль</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Стоимость продажи</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warehouseProducts.map(product => {
                   const boxes = product.boxes_in_stock || 0;
                   const pairs = boxes * (product.pairs_per_box || 6);
                   const items = pairs * 2;
                   const wholesaleValue = boxes * (product.purchase_price || 0);
                   const saleValue = boxes * (product.sale_price || 0);
                   const potentialProfit = saleValue - wholesaleValue;
                   const lowStock = boxes > 0 && boxes <= (business?.low_stock_limit || 2);
                   const noStock = boxes === 0;

                   return (
                     <tr 
                       key={product.id} 
                       className={`cursor-pointer transition-colors ${noStock ? 'bg-red-50 hover:bg-red-100' : lowStock ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-slate-50'}`}
                       onClick={() => window.location.href = createPageUrl('ProductDetail') + '?id=' + product.id + '&from=' + encodeURIComponent(createPageUrl('Warehouses') + '?warehouseId=' + selectedWarehouse.id)}
                     >
                       <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.photo_url ? (
                              <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${noStock ? 'bg-red-100' : lowStock ? 'bg-orange-100' : 'bg-slate-100'}`}>
                                <Package className={`w-5 h-5 ${noStock ? 'text-red-400' : lowStock ? 'text-orange-400' : 'text-slate-400'}`} />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{product.brand}</p>
                              <p className="text-sm text-slate-500">{product.model}</p>
                              {lowStock && <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">⚠️ Осталось мало</span>}
                              {noStock && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">❌ Нет в наличии</span>}
                            </div>
                          </div>
                        </td>
                       <td className="px-4 py-3 text-center font-semibold">
                         <span className={`px-2 py-1 rounded-full text-sm font-bold ${noStock ? 'bg-red-100 text-red-600' : lowStock ? 'bg-orange-100 text-orange-600' : 'text-indigo-600'}`}>{boxes}</span>
                       </td>
                       <td className="px-4 py-3 text-center text-slate-600">{pairs}</td>
                       <td className="px-4 py-3 text-center text-slate-600">{items}</td>
                       <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {can('view_stock_value') ? `${wholesaleValue.toLocaleString()} с.` : '••••• с.'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {can('view_profit') ? `+${potentialProfit.toLocaleString()} с.` : '••••• с.'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">
                          {can('view_stock_value') ? `${saleValue.toLocaleString()} с.` : '••••• с.'}
                        </td>
                     </tr>
                   );
                  })}
                </tbody>
              </table>
            </div>
            {warehouseProducts.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                На этом складе пока нет товаров
              </div>
            )}
          </div>
        </div>
      )}

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

      {filteredWarehouses.length === 0 && !selectedWarehouse && (
        <div className="text-center py-12">
          <WarehouseIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Склады не найдены</p>
          <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
            Добавить первый склад
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Редактировать склад' : 'Добавить склад'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label>Название склада *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Основной склад"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Адрес</Label>
              <Input 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Город, улица, дом"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Email ответственного</Label>
              <Input 
                type="email"
                value={formData.manager_email}
                onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                placeholder="manager@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Значок склада</Label>
              <div className="flex gap-2 mt-1.5">
                {WAREHOUSE_ICONS.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: key })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all flex-1 ${formData.icon === key ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <Icon className={`w-5 h-5 ${formData.icon === key ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className="text-xs text-slate-500">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingWarehouse ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}