import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/search/SearchableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Package, 
  Edit2, 
  Trash2, 
  Upload,
  Loader2,
  Box,
  Filter
} from 'lucide-react';

const BASE_PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const BASE_COLORS = ['Чёрный', 'Белый', 'Коричневый', 'Синий', 'Красный', 'Серый', 'Бежевый', 'Другой'];

export default function Products() {
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  
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
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      
      if (businesses.length > 0) {
        const biz = businesses[0];
        setBusiness(biz);
        
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
    setSaving(true);
    try {
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

      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, data);
      } else {
        await base44.entities.Product.create(data);
      }
      
      await loadData();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (confirm('Удалить этот товар?')) {
      await base44.entities.Product.delete(productId);
      await loadData();
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

  // Фильтрация
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.brand?.toLowerCase().includes(search.toLowerCase()) ||
      product.model?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || product.product_type === filterType;
    const matchesWarehouse = filterWarehouse === 'all' || product.warehouse_id === filterWarehouse;
    return matchesSearch && matchesType && matchesWarehouse;
  });

  // Расчёт общей стоимости
  const totalStockValue = filteredProducts.reduce((sum, p) => 
    sum + ((p.boxes_in_stock || 0) * (p.sale_price || 0)), 0
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
        title="Товары"
        subtitle={`${products.length} товаров на общую сумму ${totalStockValue.toLocaleString()} сомони`}
        actions={
          <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Добавить товар
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Поиск по бренду или модели..."
            className="w-full sm:w-64"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Тип товара" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {allProductTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map(product => {
          const warehouse = warehouses.find(w => w.id === product.warehouse_id);
          const totalPairs = (product.boxes_in_stock || 0) * (product.pairs_per_box || 6);
          const totalItems = totalPairs * 2;
          
          return (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo */}
              <div className="aspect-square bg-slate-100 relative">
                {product.photo_url ? (
                  <img src={product.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={() => handleOpenDialog(product)}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{product.brand}</p>
                    <p className="text-sm text-slate-500">{product.model}</p>
                  </div>
                  <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600">
                    {product.product_type}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <span className="w-4 h-4 rounded-full border-2 border-slate-300" style={{ backgroundColor: product.color === 'Чёрный' ? '#000' : product.color === 'Белый' ? '#fff' : product.color === 'Коричневый' ? '#8B4513' : '#ccc' }} />
                  <span>{product.color}</span>
                  <span>•</span>
                  <span>{product.size_from}-{product.size_to}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl mb-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-indigo-600">{product.boxes_in_stock || 0}</p>
                    <p className="text-xs text-slate-500">коробок</p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-lg font-bold text-slate-700">{totalPairs}</p>
                    <p className="text-xs text-slate-500">пар</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-700">{totalItems}</p>
                    <p className="text-xs text-slate-500">штук</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Закупка</p>
                    <p className="font-semibold text-slate-700">{product.purchase_price?.toLocaleString()} с.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Продажа</p>
                    <p className="font-semibold text-emerald-600">{product.sale_price?.toLocaleString()} с.</p>
                  </div>
                </div>

                {warehouse && (
                  <p className="text-xs text-slate-400 mt-2 truncate">📍 {warehouse.name}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Товары не найдены</p>
          <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
            Добавить первый товар
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Редактировать товар' : 'Добавить товар'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Photo Upload */}
            <div>
              <Label>Фото товара</Label>
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
                    Загрузить фото
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Бренд *</Label>
                <Input 
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Nike, Adidas..."
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Модель *</Label>
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
                label="Тип товара"
                options={allProductTypes}
                value={formData.product_type}
                onChange={(v) => setFormData({ ...formData, product_type: v })}
                placeholder="Поиск типа..."
              />
              <SearchableSelect
                label="Цвет"
                options={allColors}
                value={formData.color}
                onChange={(v) => setFormData({ ...formData, color: v })}
                placeholder="Поиск цвета..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Размер от</Label>
                <Input 
                  type="number"
                  value={formData.size_from}
                  onChange={(e) => setFormData({ ...formData, size_from: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Размер до</Label>
                <Input 
                  type="number"
                  value={formData.size_to}
                  onChange={(e) => setFormData({ ...formData, size_to: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Пар в коробке</Label>
                <Select value={String(formData.pairs_per_box)} onValueChange={(v) => setFormData({ ...formData, pairs_per_box: parseInt(v) })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 пары</SelectItem>
                    <SelectItem value="6">6 пар</SelectItem>
                    <SelectItem value="8">8 пар</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Цена закупки (сомони) *</Label>
                <Input 
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Цена продажи (сомони) *</Label>
                <Input 
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Коробок на складе</Label>
                <Input 
                  type="number"
                  value={formData.boxes_in_stock}
                  onChange={(e) => setFormData({ ...formData, boxes_in_stock: e.target.value })}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
            </div>

            {warehouses.length > 0 && (
              <SearchableSelect
                label="Склад"
                options={warehouses.map(w => w.name)}
                value={warehouses.find(w => w.id === formData.warehouse_id)?.name || ''}
                onChange={(name) => {
                  const wh = warehouses.find(w => w.name === name);
                  setFormData({ ...formData, warehouse_id: wh?.id || '' });
                }}
                placeholder="Поиск склада..."
              />
            )}
            
            {/* Auto Calculations */}
            {formData.boxes_in_stock > 0 && formData.sale_price && (
              <div className="p-4 bg-indigo-50 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-3">Автоматический расчёт</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-500">Коробок</p>
                    <p className="text-xl font-bold text-indigo-600">{formData.boxes_in_stock}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Пар</p>
                    <p className="text-xl font-bold text-slate-700">
                      {parseInt(formData.boxes_in_stock) * (parseInt(formData.pairs_per_box) || 6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Штук</p>
                    <p className="text-xl font-bold text-slate-700">
                      {parseInt(formData.boxes_in_stock) * (parseInt(formData.pairs_per_box) || 6) * 2}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-200">
                  <div>
                    <p className="text-sm text-slate-500">Общая стоимость</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(parseInt(formData.boxes_in_stock) * (parseFloat(formData.sale_price) || 0)).toLocaleString()} с.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Прибыль</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {(parseInt(formData.boxes_in_stock) * ((parseFloat(formData.sale_price) || 0) - (parseFloat(formData.purchase_price) || 0))).toLocaleString()} с.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.brand || !formData.model}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProduct ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}