import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, PackageOpen, TrendingUp, Box, Trash2,
  Loader2, ShoppingCart, Search, Wallet, Edit
} from 'lucide-react';

export default function ConsignmentProducts() {
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [sellProduct, setSellProduct] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [addForm, setAddForm] = useState({
    owner_name: '', owner_email: '', brand: '', model: '',
    product_type: 'Туфли', color: 'Чёрный', size_from: 39, size_to: 44,
    pairs_per_box: 6, owner_price: '', sale_price: '', boxes_in_stock: 0
  });

  const [sellForm, setSellForm] = useState({ boxes_sold: 1, sale_price: '', customer_name: '' });

  useEffect(() => {
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }
      if (biz) {
        setBusiness(biz);
        const [prodData, saleData] = await Promise.all([
          base44.entities.ConsignmentProduct.filter({ business_id: biz.id }),
          base44.entities.ConsignmentSale.filter({ business_id: biz.id })
        ]);
        setProducts(prodData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setSales(saleData.sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date)));
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const activeSales = sales.filter(s => !s.is_cancelled);
  const totalProfit = activeSales.reduce((sum, s) => sum + (s.seller_profit || 0), 0);
  const totalOwed = activeSales.reduce((sum, s) => sum + (s.owner_amount || 0), 0);
  const totalBoxesStock = products.reduce((sum, p) => sum + (p.boxes_in_stock || 0), 0);

  const sellSalePrice = sellForm.sale_price ? parseFloat(sellForm.sale_price) : (sellProduct?.sale_price || 0);
  const sellBoxes = parseInt(sellForm.boxes_sold) || 0;
  const sellTotal = sellSalePrice * sellBoxes;
  const sellProfit = (sellSalePrice - (sellProduct?.owner_price || 0)) * sellBoxes;
  const sellOwnerAmount = (sellProduct?.owner_price || 0) * sellBoxes;
  const sellPairs = sellBoxes * (sellProduct?.pairs_per_box || 6);
  const sellItems = sellPairs * 2;

  const handleAddSave = async () => {
    // Если имя владельца не введено — берём из настроек по умолчанию
    const finalOwnerName = addForm.owner_name.trim() || business?.default_consignment_owner || '';
    const finalOwnerEmail = addForm.owner_email.trim() || business?.default_consignment_owner_email || '';
    if (!finalOwnerName || !addForm.brand || !addForm.model || !addForm.owner_price || !addForm.sale_price) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const emp = window.__barakatEmployee;
      await base44.entities.ConsignmentProduct.create({
        ...addForm,
        owner_name: finalOwnerName,
        owner_email: finalOwnerEmail,
        owner_price: parseFloat(addForm.owner_price),
        sale_price: parseFloat(addForm.sale_price),
        size_from: parseInt(addForm.size_from) || 39,
        size_to: parseInt(addForm.size_to) || 44,
        pairs_per_box: parseInt(addForm.pairs_per_box) || 6,
        boxes_in_stock: parseInt(addForm.boxes_in_stock) || 0,
        business_id: business.id,
        seller_email: user.email,
        seller_name: emp?.name || user.full_name || user.email
      });
      setAddOpen(false);
      setAddForm({ owner_name: '', owner_email: '', brand: '', model: '', product_type: 'Туфли', color: 'Чёрный', size_from: 39, size_to: 44, pairs_per_box: 6, owner_price: '', sale_price: '', boxes_in_stock: 0 });
      await loadData();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      await base44.entities.ConsignmentProduct.update(editProduct.id, {
        owner_name: editProduct.owner_name,
        owner_email: editProduct.owner_email || '',
        brand: editProduct.brand,
        model: editProduct.model,
        owner_price: parseFloat(editProduct.owner_price) || 0,
        sale_price: parseFloat(editProduct.sale_price) || 0,
        boxes_in_stock: parseInt(editProduct.boxes_in_stock) || 0,
        color: editProduct.color,
        size_from: parseInt(editProduct.size_from) || 39,
        size_to: parseInt(editProduct.size_to) || 44,
        pairs_per_box: parseInt(editProduct.pairs_per_box) || 6
      });
      setEditProduct(null);
      await loadData();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSellSave = async () => {
    if (!sellProduct || sellBoxes < 1) return;
    if (sellBoxes > (sellProduct.boxes_in_stock || 0)) {
      alert('Недостаточно товара на реализации!');
      return;
    }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const emp = window.__barakatEmployee;
      const saleData = {
        business_id: business.id,
        product_id: sellProduct.id,
        seller_email: user.email,
        seller_name: emp?.name || user.full_name || user.email,
        owner_name: sellProduct.owner_name,
        owner_email: sellProduct.owner_email || '',
        brand: sellProduct.brand,
        model: sellProduct.model,
        boxes_sold: sellBoxes,
        pairs_sold: sellPairs,
        items_sold: sellItems,
        owner_price: sellProduct.owner_price,
        sale_price: sellSalePrice,
        total_amount: sellTotal,
        seller_profit: sellProfit,
        owner_amount: sellOwnerAmount,
        sale_date: new Date().toISOString(),
        customer_name: sellForm.customer_name || '',
        is_cancelled: false
      };
      await base44.entities.ConsignmentSale.create(saleData);
      const newStock = Math.max(0, (sellProduct.boxes_in_stock || 0) - sellBoxes);
      await base44.entities.ConsignmentProduct.update(sellProduct.id, { boxes_in_stock: newStock });
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: 'create',
        entity_type: 'ConsignmentSale',
        entity_id: '',
        entity_data: saleData,
        user_email: user.email,
        description: `Реализация: ${sellProduct.brand} ${sellProduct.model}, ${sellBoxes} кор. × ${sellSalePrice} = ${sellTotal} с. (прибыль: ${sellProfit} с., владельцу: ${sellOwnerAmount} с.)`
      });
      setSellProduct(null);
      setSellForm({ boxes_sold: 1, sale_price: '', customer_name: '' });
      await loadData();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить товар на реализации?')) return;
    try {
      await base44.entities.ConsignmentProduct.delete(id);
      await loadData();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return `${p.brand || ''} ${p.model || ''} ${p.owner_name || ''}`.toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Чужие товары (на реализации)"
        subtitle={`${products.length} товаров · ${totalBoxesStock} коробок в наличии`}
        actions={
          <Button onClick={() => setAddOpen(true)} size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Добавить</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <PackageOpen className="w-4 h-4 text-teal-600" />
            <span className="text-xs text-slate-500 truncate">Товаров</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{products.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Box className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-500 truncate">В наличии</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{totalBoxesStock} кор.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-500 truncate">Прибыль с реализации</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{totalProfit.toLocaleString()} с.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-slate-500 truncate">Долг владельцам</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{totalOwed.toLocaleString()} с.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по товару или владельцу..." className="pl-10" />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PackageOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Нет товаров на реализации. Добавьте первый товар!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const profitPerBox = (product.sale_price || 0) - (product.owner_price || 0);
            const isLowStock = (product.boxes_in_stock || 0) <= 0;
            return (
              <div key={product.id} className={`bg-white dark:bg-slate-900 rounded-xl border ${isLowStock ? 'border-red-200 dark:border-red-800 opacity-60' : 'border-slate-100 dark:border-slate-800'} p-4 shadow-sm`}>
                <div className="flex items-start gap-3 mb-3">
                  {product.photo_url ? (
                    <img src={product.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <PackageOpen className="w-7 h-7 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{product.brand} {product.model}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {[product.color, product.size_from && product.size_to ? `${product.size_from}–${product.size_to}` : null].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-teal-600 font-medium mt-0.5">👤 {product.owner_name}</p>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Цена владельца:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{product.owner_price?.toLocaleString()} с.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Цена продажи:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{product.sale_price?.toLocaleString()} с.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Прибыль/кор:</span>
                    <span className="font-semibold text-emerald-600">+{profitPerBox.toLocaleString()} с.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">На складе:</span>
                    <span className={`font-semibold ${isLowStock ? 'text-red-500' : 'text-indigo-600'}`}>{product.boxes_in_stock || 0} кор.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setSellProduct(product); setSellForm({ boxes_sold: 1, sale_price: '', customer_name: '' }); }} disabled={isLowStock} className="flex-1 bg-teal-600 hover:bg-teal-700 gap-1 text-xs h-8">
                    <ShoppingCart className="w-3.5 h-3.5" /> Продать
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditProduct({ ...product })} className="h-8 px-2">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(product.id)} className="h-8 px-2 text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Добавить товар на реализацию</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-xs text-teal-700 dark:text-teal-300">
              💡 Товар принадлежит другому владельцу. Вы продаёте его и получаете только разницу между ценой продажи и ценой владельца.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Владелец товара {business?.default_consignment_owner ? '(необяз.)' : '*'}</Label>
                <Input value={addForm.owner_name} onChange={e => setAddForm({ ...addForm, owner_name: e.target.value })} placeholder={business?.default_consignment_owner || 'Имя владельца'} className="mt-1" />
                {business?.default_consignment_owner && (
                  <p className="text-xs text-teal-600 mt-1">💡 По умолчанию: <strong>{business.default_consignment_owner}</strong></p>
                )}
              </div>
              <div>
                <Label>Email владельца</Label>
                <Input value={addForm.owner_email} onChange={e => setAddForm({ ...addForm, owner_email: e.target.value })} placeholder={business?.default_consignment_owner_email || 'email (необяз.)'} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Бренд *</Label>
                <Input value={addForm.brand} onChange={e => setAddForm({ ...addForm, brand: e.target.value })} placeholder="Nike" className="mt-1" />
              </div>
              <div>
                <Label>Модель *</Label>
                <Input value={addForm.model} onChange={e => setAddForm({ ...addForm, model: e.target.value })} placeholder="Air Max" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Цвет</Label>
                <Input value={addForm.color} onChange={e => setAddForm({ ...addForm, color: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Размер от</Label>
                <Input type="number" value={addForm.size_from} onChange={e => setAddForm({ ...addForm, size_from: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Размер до</Label>
                <Input type="number" value={addForm.size_to} onChange={e => setAddForm({ ...addForm, size_to: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Пар в коробке</Label>
                <Input type="number" value={addForm.pairs_per_box} onChange={e => setAddForm({ ...addForm, pairs_per_box: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Коробок на реализацию</Label>
                <Input type="number" value={addForm.boxes_in_stock} onChange={e => setAddForm({ ...addForm, boxes_in_stock: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Цена владельца (за кор.) *</Label>
                <Input type="number" value={addForm.owner_price} onChange={e => setAddForm({ ...addForm, owner_price: e.target.value })} placeholder="100" className="mt-1" />
                <p className="text-xs text-slate-500 mt-1">Сколько вы платите владельцу</p>
              </div>
              <div>
                <Label>Цена продажи (за кор.) *</Label>
                <Input type="number" value={addForm.sale_price} onChange={e => setAddForm({ ...addForm, sale_price: e.target.value })} placeholder="130" className="mt-1" />
                <p className="text-xs text-emerald-600 mt-1">Прибыль/кор: {((parseFloat(addForm.sale_price) || 0) - (parseFloat(addForm.owner_price) || 0)).toLocaleString()} с.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={handleAddSave} disabled={saving || (!addForm.owner_name && !business?.default_consignment_owner) || !addForm.brand || !addForm.owner_price || !addForm.sale_price} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(v) => !v && setEditProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Редактировать товар</DialogTitle></DialogHeader>
          {editProduct && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Владелец товара</Label>
                  <Input value={editProduct.owner_name || ''} onChange={e => setEditProduct({ ...editProduct, owner_name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Email владельца</Label>
                  <Input value={editProduct.owner_email || ''} onChange={e => setEditProduct({ ...editProduct, owner_email: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Бренд</Label>
                  <Input value={editProduct.brand || ''} onChange={e => setEditProduct({ ...editProduct, brand: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Модель</Label>
                  <Input value={editProduct.model || ''} onChange={e => setEditProduct({ ...editProduct, model: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Цена владельца (за кор.)</Label>
                  <Input type="number" value={editProduct.owner_price || ''} onChange={e => setEditProduct({ ...editProduct, owner_price: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Цена продажи (за кор.)</Label>
                  <Input type="number" value={editProduct.sale_price || ''} onChange={e => setEditProduct({ ...editProduct, sale_price: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Коробок на складе</Label>
                  <Input type="number" value={editProduct.boxes_in_stock || 0} onChange={e => setEditProduct({ ...editProduct, boxes_in_stock: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Размер от</Label>
                  <Input type="number" value={editProduct.size_from || 39} onChange={e => setEditProduct({ ...editProduct, size_from: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Размер до</Label>
                  <Input type="number" value={editProduct.size_to || 44} onChange={e => setEditProduct({ ...editProduct, size_to: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Цвет</Label>
                  <Input value={editProduct.color || ''} onChange={e => setEditProduct({ ...editProduct, color: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Пар в коробке</Label>
                  <Input type="number" value={editProduct.pairs_per_box || 6} onChange={e => setEditProduct({ ...editProduct, pairs_per_box: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditProduct(null)}>Отмена</Button>
            <Button onClick={handleEditSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell Dialog */}
      <Dialog open={!!sellProduct} onOpenChange={(v) => !v && setSellProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Продажа товара на реализации</DialogTitle></DialogHeader>
          {sellProduct && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                <p className="font-semibold text-slate-900 dark:text-white">{sellProduct.brand} {sellProduct.model}</p>
                <p className="text-xs text-slate-500">👤 Владелец: {sellProduct.owner_name} · В наличии: {sellProduct.boxes_in_stock} кор.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Коробок *</Label>
                  <Input type="number" min="1" max={sellProduct.boxes_in_stock} value={sellForm.boxes_sold} onChange={e => setSellForm({ ...sellForm, boxes_sold: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Цена продажи (за кор.)</Label>
                  <Input type="number" value={sellForm.sale_price} onChange={e => setSellForm({ ...sellForm, sale_price: e.target.value })} placeholder={sellProduct.sale_price} className="mt-1" />
                  <p className="text-xs text-slate-500 mt-1">По умолч.: {sellProduct.sale_price?.toLocaleString()} с.</p>
                </div>
              </div>
              <div>
                <Label>Имя клиента</Label>
                <Input value={sellForm.customer_name} onChange={e => setSellForm({ ...sellForm, customer_name: e.target.value })} placeholder="Необязательно" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">Пар:</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{sellPairs}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Сумма продажи:</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{sellTotal.toLocaleString()} с.</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ваша прибыль:</p>
                  <p className="text-lg font-semibold text-emerald-600">+{sellProfit.toLocaleString()} с.</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Владельцу товара:</p>
                  <p className="text-lg font-semibold text-amber-600">{sellOwnerAmount.toLocaleString()} с.</p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                ⚠️ Из суммы продажи <b>{sellTotal.toLocaleString()} с.</b> только <b>{sellProfit.toLocaleString()} с.</b> — ваша прибыль. Остаток <b>{sellOwnerAmount.toLocaleString()} с.</b> должен быть передан владельцу товара.
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSellProduct(null)}>Отмена</Button>
            <Button onClick={handleSellSave} disabled={saving || sellBoxes < 1} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Продать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}