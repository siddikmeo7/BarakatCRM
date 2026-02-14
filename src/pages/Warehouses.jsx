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
import { 
  Plus, 
  Warehouse as WarehouseIcon, 
  Edit2, 
  Trash2, 
  MapPin,
  Package,
  Box,
  Loader2,
  ChevronRight
} from 'lucide-react';

export default function Warehouses() {
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
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    manager_email: ''
  });

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
        manager_email: warehouse.manager_email || ''
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ name: '', address: '', manager_email: '' });
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

  // Расчёты для каждого склада
  const getWarehouseStats = (warehouseId) => {
    const warehouseProducts = products.filter(p => p.warehouse_id === warehouseId);
    const warehouseSales = sales.filter(s => s.warehouse_id === warehouseId);
    
    const totalBoxes = warehouseProducts.reduce((sum, p) => sum + (p.boxes_in_stock || 0), 0);
    const totalValue = warehouseProducts.reduce((sum, p) => sum + ((p.boxes_in_stock || 0) * (p.sale_price || 0)), 0);
    const soldBoxes = warehouseSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
    const revenue = warehouseSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    
    return { totalBoxes, totalValue, soldBoxes, revenue, productsCount: warehouseProducts.length };
  };

  const filteredWarehouses = warehouses.filter(wh =>
    wh.name?.toLowerCase().includes(search.toLowerCase()) ||
    wh.address?.toLowerCase().includes(search.toLowerCase())
  );

  // Товары выбранного склада
  const warehouseProducts = selectedWarehouse 
    ? products.filter(p => p.warehouse_id === selectedWarehouse.id)
    : [];

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
          <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Добавить склад
          </Button>
        }
      />

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Поиск склада..."
          className="max-w-md"
        />
      </div>

      {/* Warehouses Grid */}
      {!selectedWarehouse ? (
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
                      <WarehouseIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex gap-1">
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
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{warehouse.name}</h3>
                  {warehouse.address && (
                    <p className="text-sm text-slate-500 flex items-center gap-1 mb-4">
                      <MapPin className="w-4 h-4" />
                      {warehouse.address}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stats.totalBoxes}</p>
                      <p className="text-xs text-slate-500">коробок</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{stats.totalValue.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">сомони</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700">{stats.productsCount}</p>
                      <p className="text-xs text-slate-500">товаров</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-600">{stats.soldBoxes}</p>
                      <p className="text-xs text-slate-500">продано</p>
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
      ) : (
        /* Warehouse Details */
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedWarehouse(null)}>
              ← Назад
            </Button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedWarehouse.name}</h2>
              {selectedWarehouse.address && (
                <p className="text-sm text-slate-500">{selectedWarehouse.address}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <p className="text-sm text-slate-500">Стоимость</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.totalValue.toLocaleString()} с.</p>
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
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Товары на складе</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Товар</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Коробок</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Пар</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Штук</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Стоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warehouseProducts.map(product => {
                    const pairs = (product.boxes_in_stock || 0) * (product.pairs_per_box || 6);
                    const items = pairs * 2;
                    const value = (product.boxes_in_stock || 0) * (product.sale_price || 0);
                    
                    return (
                      <tr 
                        key={product.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => window.location.href = createPageUrl('ProductDetail') + '?id=' + product.id}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.photo_url ? (
                              <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{product.brand}</p>
                              <p className="text-sm text-slate-500">{product.model}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                          {product.boxes_in_stock || 0}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{pairs}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{items}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {value.toLocaleString()} с.
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