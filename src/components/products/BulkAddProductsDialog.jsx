import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Package, CheckCheck, Copy, Box, TrendingUp, DollarSign, AlertCircle, RotateCcw, Star, PackageOpen, CheckCheck as CheckIcon } from 'lucide-react';
import { findDuplicateProduct, findDuplicateInRows } from '@/lib/productDuplicate';
import ConsignmentOwnerPicker from '@/components/products/ConsignmentOwnerPicker';

const BASE_PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const BASE_COLORS = ['Чёрный', 'Белый', 'Коричневый', 'Синий', 'Красный', 'Серый', 'Бежевый', 'Другой'];
const DRAFT_KEY = 'barakat_bulk_add_draft';

function emptyRow(defaults = {}) {
  return {
    _id: Math.random().toString(36).slice(2),
    brand: defaults.brand || '',
    model: '',
    product_type: defaults.product_type || 'Туфли',
    color: defaults.color || 'Чёрный',
    size_from: defaults.size_from || 39,
    size_to: defaults.size_to || 44,
    pairs_per_box: defaults.pairs_per_box || 6,
    purchase_price: defaults.purchase_price || '',
    sale_price: defaults.sale_price || '',
    boxes_in_stock: defaults.boxes_in_stock || '',
    warehouse_id: defaults.warehouse_id || '',
  };
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_) {}
  return null;
}

function saveDraft(rows) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(rows));
  } catch (_) {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export default function BulkAddProductsDialog({ open, onClose, business, warehouses, existingProducts = [], onSaved }) {
  const allProductTypes = [...BASE_PRODUCT_TYPES, ...(business?.custom_product_types || [])];
  const allColors = [...BASE_COLORS, ...(business?.custom_colors || [])];

  const defaultsFromBiz = {
    product_type: business?.default_product_type || 'Туфли',
    color: business?.default_color || 'Чёрный',
    size_from: business?.default_size_from || 39,
    size_to: business?.default_size_to || 44,
    pairs_per_box: business?.default_pairs_per_box || 6,
    warehouse_id: warehouses[0]?.id || '',
  };

  const initRows = () => loadDraft() || [emptyRow(defaultsFromBiz), emptyRow(defaultsFromBiz)];

  const [rows, setRows] = useState(initRows);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [hasDraft, setHasDraft] = useState(() => !!loadDraft());
  // ID строки, цены которой применяются ко всем остальным без цен
  const [priceSourceId, setPriceSourceId] = useState(null);
  const savingRef = useRef(false);
  // Реализация — общий режим для всех строк
  const [isConsignment, setIsConsignment] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // При открытии — подгружаем черновик если есть
  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      if (draft) {
        setRows(draft);
        setHasDraft(true);
        // Автовыбор эталонной строки — первая с заполненными ценами
        const src = draft.find(r => r.purchase_price || r.sale_price);
        setPriceSourceId(src?._id || null);
      } else {
        setPriceSourceId(null);
      }
    }
  }, [open]);

  // Сохраняем черновик при каждом изменении rows
  useEffect(() => {
    if (saving) return;
    saveDraft(rows);
    setHasDraft(true);
  }, [rows]);

  // Когда меняем priceSourceId — применяем цены источника ко всем пустым строкам
  const applyPriceSource = (sourceId, currentRows) => {
    const src = currentRows.find(r => r._id === sourceId);
    if (!src) return currentRows;
    return currentRows.map(r => {
      if (r._id === sourceId) return r;
      return {
        ...r,
        purchase_price: r.purchase_price || src.purchase_price,
        sale_price: r.sale_price || src.sale_price,
      };
    });
  };

  const updateRow = (id, field, value) => {
    setRows(prev => {
      const updated = prev.map(r => r._id === id ? { ...r, [field]: value } : r);
      // Если поменяли цену в эталонной строке — перезаписываем пустые
      if ((field === 'purchase_price' || field === 'sale_price') && id === priceSourceId) {
        return applyPriceSource(id, updated);
      }
      return updated;
    });
  };

  const addRow = () => {
    const last = rows[rows.length - 1] || {};
    // Для новой строки берём цены из эталона если он задан
    const src = priceSourceId ? rows.find(r => r._id === priceSourceId) : null;
    const newRow = emptyRow({
      brand: last.brand,
      product_type: last.product_type,
      color: last.color,
      size_from: last.size_from,
      size_to: last.size_to,
      pairs_per_box: last.pairs_per_box,
      purchase_price: src?.purchase_price || last.purchase_price || '',
      sale_price: src?.sale_price || last.sale_price || '',
      boxes_in_stock: '',
      warehouse_id: last.warehouse_id,
    });
    setRows(prev => [...prev, newRow]);
  };

  const removeRow = (id) => {
    setRows(prev => prev.filter(r => r._id !== id));
    if (priceSourceId === id) setPriceSourceId(null);
  };

  const duplicateRow = (id) => {
    const row = rows.find(r => r._id === id);
    if (!row) return;
    const newRow = { ...row, _id: Math.random().toString(36).slice(2), model: '' };
    setRows(prev => {
      const idx = prev.findIndex(r => r._id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  };

  const applyBrandToAll = (brand) => setRows(prev => prev.map(r => ({ ...r, brand })));

  // Установить эталонную строку и применить её цены ко всем пустым
  const setAsSource = (id) => {
    const newSrcId = priceSourceId === id ? null : id;
    setPriceSourceId(newSrcId);
    if (newSrcId) {
      setRows(prev => applyPriceSource(newSrcId, prev));
    }
  };

  const handleClearDraft = () => {
    if (!confirm('Аннулировать черновик? Все введённые данные будут удалены.')) return;
    clearDraft();
    setRows([emptyRow(defaultsFromBiz), emptyRow(defaultsFromBiz)]);
    setPriceSourceId(null);
    setHasDraft(false);
    setProgress(null);
    setIsConsignment(false);
    setOwnerName('');
    setOwnerEmail('');
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const validRows = rows.filter(r => r.brand.trim() && r.model.trim());
    if (validRows.length === 0) return;

    savingRef.current = true;
    setSaving(true);
    setProgress({ done: 0, total: validRows.length, errors: 0 });

    let done = 0;
    let errors = 0;

    try {
      const user = await base44.auth.me().catch(() => ({ email: 'unknown' }));

      for (const row of validRows) {
        try {
          // Подставляем цену из эталона если у строки пустые цены
          const src = priceSourceId ? rows.find(r => r._id === priceSourceId) : null;
          const purchasePrice = parseFloat(row.purchase_price) || (src ? parseFloat(src.purchase_price) : 0) || 0;
          const salePrice = parseFloat(row.sale_price) || (src ? parseFloat(src.sale_price) : 0) || 0;

          if (isConsignment) {
            // Товар на реализации — создаём ConsignmentProduct
            const data = {
              business_id: business.id,
              owner_name: ownerName.trim(),
              owner_email: ownerEmail.trim(),
              seller_email: user.email,
              seller_name: user.full_name || user.email,
              brand: row.brand.trim(),
              model: row.model.trim(),
              product_type: row.product_type,
              color: row.color,
              size_from: parseInt(row.size_from) || 39,
              size_to: parseInt(row.size_to) || 44,
              pairs_per_box: parseInt(row.pairs_per_box) || 6,
              photo_url: '',
              owner_price: purchasePrice,
              sale_price: salePrice,
              boxes_in_stock: parseInt(row.boxes_in_stock) || 0,
            };
            const created = await base44.entities.ConsignmentProduct.create(data);
            await base44.entities.ActivityLog.create({
              business_id: business.id,
              action_type: 'create',
              entity_type: 'ConsignmentProduct',
              entity_id: created.id,
              entity_data: data,
              user_email: user.email,
              description: `Добавлен товар на реализацию: ${data.brand} ${data.model} (${data.boxes_in_stock} кор., владелец: ${data.owner_name})`,
            });
          } else {
            const data = {
              business_id: business.id,
              brand: row.brand.trim(),
              model: row.model.trim(),
              product_type: row.product_type,
              color: row.color,
              size_from: parseInt(row.size_from) || 39,
              size_to: parseInt(row.size_to) || 44,
              pairs_per_box: parseInt(row.pairs_per_box) || 6,
              purchase_price: purchasePrice,
              sale_price: salePrice,
              boxes_in_stock: parseInt(row.boxes_in_stock) || 0,
              warehouse_id: row.warehouse_id || '',
            };
            const created = await base44.entities.Product.create(data);
            await base44.entities.ActivityLog.create({
              business_id: business.id,
              action_type: 'create',
              entity_type: 'Product',
              entity_id: created.id,
              entity_data: data,
              user_email: user.email,
              description: `Добавлен товар: ${data.brand} ${data.model} (${data.boxes_in_stock} кор., ${data.sale_price?.toLocaleString()} с.)`,
            });
          }
          done++;
        } catch (err) {
          console.error('Ошибка при добавлении строки:', err);
          errors++;
        }
        setProgress({ done, total: validRows.length, errors });
      }

      clearDraft();
      setHasDraft(false);
      await onSaved();
      setTimeout(() => {
        setRows([emptyRow(defaultsFromBiz), emptyRow(defaultsFromBiz)]);
        setProgress(null);
        setPriceSourceId(null);
        setIsConsignment(false);
        setOwnerName('');
        setOwnerEmail('');
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  // Закрытие диалога — НЕ сбрасываем данные, черновик сохранён
  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const validRows = rows.filter(r => r.brand.trim() && r.model.trim());
  const validCount = validRows.length;

  // Итоговая сводка — используем цены из эталона для строк без цен
  const src = priceSourceId ? rows.find(r => r._id === priceSourceId) : null;
  const totalBoxes = validRows.reduce((sum, r) => sum + (parseInt(r.boxes_in_stock) || 0), 0);
  const totalSaleValue = validRows.reduce((sum, r) => {
    const sp = parseFloat(r.sale_price) || (src ? parseFloat(src.sale_price) : 0) || 0;
    return sum + (parseInt(r.boxes_in_stock) || 0) * sp;
  }, 0);
  const totalPurchaseValue = validRows.reduce((sum, r) => {
    const pp = parseFloat(r.purchase_price) || (src ? parseFloat(src.purchase_price) : 0) || 0;
    return sum + (parseInt(r.boxes_in_stock) || 0) * pp;
  }, 0);
  const totalProfit = totalSaleValue - totalPurchaseValue;

  // === Проверка дубликатов ===
  // 1) строка совпадает с уже существующим товаром (бренд+модель+цвет+тип+размеры+склад)
  const getRowDuplicate = (row) => findDuplicateProduct(existingProducts, {
    brand: row.brand, model: row.model, warehouseId: row.warehouse_id, isConsignment,
    color: row.color, productType: row.product_type,
    sizeFrom: row.size_from, sizeTo: row.size_to
  });
  // 2) дубликат ВНУТРИ списка строк (две строки с одинаковыми бренд+модель+склад)
  const intraDup = findDuplicateInRows(validRows);
  const intraDupIds = (() => {
    if (!intraDup) return new Set();
    return new Set([validRows[intraDup.rowIndex]._id, validRows[intraDup.dupIndex]._id]);
  })();
  const duplicateRowCount = validRows.filter(r => getRowDuplicate(r)).length;
  const hasAnyDuplicate = duplicateRowCount > 0 || intraDupIds.size > 0;
  // Реализация: владелец обязателен
  const consignmentMissingOwner = isConsignment && !ownerName.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Добавить много товаров
            </DialogTitle>
            {hasDraft && (
              <div className="flex items-center gap-2 mr-6">
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  📝 Черновик сохранён
                </span>
                <button
                  onClick={handleClearDraft}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Аннулировать
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Info */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
            💡 Нажмите ⭐ на любой строке чтобы сделать её эталоном цен — остальные строки без цены автоматически получат те же цены.
          </div>

          {/* Реализация toggle — общий для всех строк */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${isConsignment ? 'bg-teal-50 border-teal-300' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
            onClick={() => setIsConsignment(v => !v)}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isConsignment ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>
              {isConsignment && <CheckIcon className="w-3 h-3 text-white" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
                <PackageOpen className="w-4 h-4 text-teal-500" />
                Не мой товар (реализация)
              </p>
              <p className="text-xs text-slate-500">Все добавляемые товары принадлежат одному владельцу</p>
            </div>
          </div>

          {/* Владелец для реализации — общий для всех строк */}
          {isConsignment && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
              <Label className="text-xs font-semibold text-slate-600">Владелец товаров *</Label>
              <ConsignmentOwnerPicker
                businessId={business?.id}
                ownerName={ownerName}
                ownerEmail={ownerEmail}
                onChange={(name, email) => { setOwnerName(name); setOwnerEmail(email); }}
              />
              <p className="text-xs text-slate-500 mt-2">
                Выберите из списка или добавьте нового — это исключит опечатки в имени владельца.
              </p>
            </div>
          )}

          {/* Common brand */}
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs font-semibold text-slate-500">Бренд (применить ко всем)</Label>
                <Input
                  value={rows[0]?.brand || ''}
                  onChange={e => applyBrandToAll(e.target.value)}
                  placeholder="Nike, Adidas..."
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div className="text-xs text-slate-400">{rows.length} строк</div>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row, idx) => {
              const isSource = row._id === priceSourceId;
              const effectiveSalePrice = parseFloat(row.sale_price) || (src && !isSource ? parseFloat(src.sale_price) : 0) || 0;
              const effectivePurchasePrice = parseFloat(row.purchase_price) || (src && !isSource ? parseFloat(src.purchase_price) : 0) || 0;
              const rowTotal = (parseInt(row.boxes_in_stock) || 0) * effectiveSalePrice;
              const rowProfit = (parseInt(row.boxes_in_stock) || 0) * (effectiveSalePrice - effectivePurchasePrice);
              const existingDup = row.brand.trim() && row.model.trim() ? getRowDuplicate(row) : null;
              const isDuplicate = !!existingDup || intraDupIds.has(row._id);

              return (
                <div key={row._id} className={`bg-white border rounded-xl p-3 transition-all ${isSource ? 'border-amber-400 ring-1 ring-amber-200' : isDuplicate ? 'border-red-400 ring-1 ring-red-200 bg-red-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {/* Номер + эталон */}
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      <button
                        onClick={() => setAsSource(row._id)}
                        title={isSource ? 'Убрать эталон' : 'Сделать эталоном цен'}
                        className={`p-0.5 rounded transition-colors ${isSource ? 'text-amber-500' : 'text-slate-200 hover:text-amber-400'}`}
                      >
                        <Star className="w-3 h-3" fill={isSource ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="col-span-2 sm:col-span-1">
                        <Input
                          value={row.model}
                          onChange={e => updateRow(row._id, 'model', e.target.value)}
                          placeholder="Модель *"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Input
                          type="text" inputMode="numeric"
                          value={row.boxes_in_stock}
                          onChange={e => updateRow(row._id, 'boxes_in_stock', e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="Коробок"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Input
                          type="text" inputMode="decimal"
                          value={row.sale_price}
                          onChange={e => updateRow(row._id, 'sale_price', e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder={src && !isSource && src.sale_price ? `Авто: ${src.sale_price}` : 'Цена прод.'}
                          className={`h-8 text-sm ${!row.sale_price && src && !isSource ? 'border-amber-200 bg-amber-50 placeholder:text-amber-500' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => duplicateRow(row._id)} title="Дублировать"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {rows.length > 1 && (
                        <button onClick={() => removeRow(row._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Select value={row.color} onValueChange={v => updateRow(row._id, 'color', v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input type="text" inputMode="numeric"
                        value={row.size_from}
                        onChange={e => updateRow(row._id, 'size_from', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="От" className="h-7 text-xs flex-1" />
                      <Input type="text" inputMode="numeric"
                        value={row.size_to}
                        onChange={e => updateRow(row._id, 'size_to', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="До" className="h-7 text-xs flex-1" />
                    </div>
                    <Select value={row.warehouse_id} onValueChange={v => updateRow(row._id, 'warehouse_id', v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Склад" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="text" inputMode="decimal"
                      value={row.purchase_price}
                      onChange={e => updateRow(row._id, 'purchase_price', e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder={src && !isSource && src.purchase_price ? `Авто: ${src.purchase_price}` : 'Цена заку.'}
                      className={`h-7 text-xs ${!row.purchase_price && src && !isSource ? 'border-amber-200 bg-amber-50 placeholder:text-amber-500' : ''}`}
                    />
                  </div>

                  {/* Мини-итог по строке */}
                  {row.boxes_in_stock && (effectiveSalePrice > 0) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 pl-1">
                      <span>📦 {parseInt(row.boxes_in_stock) || 0} кор.</span>
                      <span>💰 {rowTotal.toLocaleString()} с.
                        {!row.sale_price && src && !isSource && <span className="ml-1 text-amber-500">(из эталона)</span>}
                      </span>
                      {effectivePurchasePrice > 0 && (
                        <span className="text-emerald-600">📈 +{rowProfit.toLocaleString()} с.</span>
                      )}
                    </div>
                  )}

                  {isSource && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-600 font-medium">
                      <Star className="w-3 h-3" fill="currentColor" />
                      Эталон цен — остальные строки без цены используют эту
                    </div>
                  )}

                  {isDuplicate && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        {existingDup
                          ? <>Уже есть в системе: «{existingDup.brand} {existingDup.model}»{existingDup.warehouse_id ? '' : ' (реализация)'} — добавьте коробки к существующему.</>
                          : 'Дубликат внутри списка — две строки с одинаковыми бренд+модель+склад.'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add row */}
          <button onClick={addRow}
            className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 text-sm font-medium hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Добавить строку
          </button>

          {/* Предупреждение о дубликатах */}
          {hasAnyDuplicate && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Найдены дубликаты ({duplicateRowCount + intraDupIds.size})</p>
                <p className="text-red-600 mt-0.5">Товар считается дубликатом, если совпадают бренд + модель + цвет + тип + размеры + склад. Измените хотя бы одно поле (например цвет), выберите другой склад или удалите строку-дубликат.</p>
              </div>
            </div>
          )}

          {/* Итоговая сводка */}
          {validCount > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">📊 Итого по {validCount} товарам</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                  <Box className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Коробок</p>
                  <p className="text-xl font-bold text-indigo-600">{totalBoxes}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                  <DollarSign className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Сумма продаж</p>
                  <p className="text-lg font-bold text-blue-600">{totalSaleValue.toLocaleString()} с.</p>
                </div>
                {totalPurchaseValue > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                    <Package className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">По закупке</p>
                    <p className="text-lg font-bold text-slate-600">{totalPurchaseValue.toLocaleString()} с.</p>
                  </div>
                )}
                {totalPurchaseValue > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Прибыль</p>
                    <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()} с.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Прогресс сохранения */}
          {progress && (
            <div className={`rounded-xl p-3 border ${progress.errors > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {progress.done < progress.total ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                ) : progress.errors > 0 ? (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                )}
                <span className="text-sm font-semibold">
                  {progress.done < progress.total
                    ? `Сохранение... ${progress.done} / ${progress.total}`
                    : progress.errors > 0
                    ? `Сохранено ${progress.done} из ${progress.total} (${progress.errors} ошибок)`
                    : `✅ Все ${progress.done} товаров успешно добавлены!`}
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2 border border-slate-200">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${progress.errors > 0 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Готово к сохранению: <span className="font-bold text-indigo-600">{validCount}</span> товаров
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>Закрыть</Button>
            <Button
              onClick={handleSave}
              disabled={saving || validCount === 0 || hasAnyDuplicate || consignmentMissingOwner}
              className={`gap-2 ${progress?.done === progress?.total && progress?.done > 0 ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
               progress?.done === progress?.total && progress?.done > 0 ? <CheckCheck className="w-4 h-4" /> :
               <Plus className="w-4 h-4" />}
              {progress?.done === progress?.total && progress?.done > 0
                ? 'Сохранено!'
                : `Сохранить ${validCount > 0 ? validCount : ''} товаров`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}