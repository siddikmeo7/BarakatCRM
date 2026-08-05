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
import MandatoryCustomerPicker from '@/components/sales/MandatoryCustomerPicker';
import SaleDetailDialog from '@/components/sales/SaleDetailDialog';
import MultiSaleDialog from '@/components/sales/MultiSaleDialog';
import CustomerGroupedView from '@/components/sales/CustomerGroupedView';
import CustomerPurchasesDialog from '@/components/sales/CustomerPurchasesDialog';
import SaleNotifyChannels from '@/components/sales/SaleNotifyChannels';
import { buildSaleMessage, notifyCustomerChannels } from '@/lib/customerNotify';
import { 
  Plus, 
  ShoppingCart, 
  Package,
  PackageOpen,
  Box,
  Layers,
  Hash,
  TrendingUp,
  Loader2,
  Search,
  ChevronRight,
  ChevronLeft,
  Grid3x3,
  List,
  Clock,
  AlertTriangle,
  Users,
  Trash2
} from 'lucide-react';
import ViewToggle from '@/components/ui/ViewToggle';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

const SALES_PAGE_SIZE = 25;
import { t } from '@/components/i18n/translations';
import { ru } from 'date-fns/locale';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageLoader from '@/components/ui/PageLoader';
import { useDraft } from '@/hooks/useDraft';

export default function Sales() {
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [consignmentProducts, setConsignmentProducts] = useState([]);
  const [consignmentSales, setConsignmentSales] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
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
  const [filterCustomerSearch, setFilterCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filterTime, setFilterTime] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterPaymentType, setFilterPaymentType] = useState('all'); // all, cash, debt
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState(null);
  
  const [formData, setFormData] = useState({
    product_id: '',
    is_consignment: false,
    boxes_sold: 1,
    custom_sale_price: '',
    is_debt: false,
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    partial_payment: 0
  });
  const [productSearch, setProductSearch] = useState('');
  const [notifyChannels, setNotifyChannels] = useState(['whatsapp']);
  const [paymentDueDate, setPaymentDueDate] = useState('');

  // === Черновик одиночной продажи ===
  const singleDraftKey = `single_sale_${business?.id || 'default'}`;
  const { draft: singleSaleDraft, saveDraft: saveSingleDraft, clearDraft: clearSingleDraft, hasDraft: hasSingleDraft } = useDraft(singleDraftKey);

  const DEFAULT_SALE_FORM = { product_id: '', is_consignment: false, boxes_sold: 1, custom_sale_price: '', is_debt: false, customer_id: '', customer_name: '', customer_phone: '', customer_address: '', partial_payment: 0 };

  const saveSingleSaleDraft = () => {
    saveSingleDraft({ formData, productSearch, notifyChannels, paymentDueDate });
  };
  const resetSingleSaleDraft = () => {
    clearSingleDraft();
    setFormData({ ...DEFAULT_SALE_FORM });
    setProductSearch('');
    setPaymentDueDate('');
    const def = business?.default_notify_channels;
    setNotifyChannels(Array.isArray(def) && def.length ? def : ['whatsapp']);
  };

  // Восстановление черновика при открытии диалога
  useEffect(() => {
    if (dialogOpen && singleSaleDraft) {
      setFormData(prev => ({ ...prev, ...(singleSaleDraft.formData || {}) }));
      if (singleSaleDraft.productSearch) setProductSearch(singleSaleDraft.productSearch);
      if (Array.isArray(singleSaleDraft.notifyChannels) && singleSaleDraft.notifyChannels.length) setNotifyChannels(singleSaleDraft.notifyChannels);
      if (singleSaleDraft.paymentDueDate != null) setPaymentDueDate(singleSaleDraft.paymentDueDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  useEffect(() => {
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  // При открытии окна продажи — ставим каналы по умолчанию из настроек бизнеса
  // Внимание: зависимость только от dialogOpen, иначе сброс перетрёт выбор пользователя
  useEffect(() => {
    if (dialogOpen) {
      const def = business?.default_notify_channels;
      setNotifyChannels(Array.isArray(def) && def.length ? def : ['whatsapp']);
      setPaymentDueDate('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  useEffect(() => {
    if (!showCustomerDropdown) return;
    const handler = (e) => {
      if (!e.target.closest('.customer-filter-dropdown')) setShowCustomerDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCustomerDropdown]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }
      
      if (biz) {
        setBusiness(biz);
        setLang(biz.language || 'ru');
        
        const [salesData, productsData, warehousesData, customersData, employeesData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Warehouse.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.Employee.filter({ business_id: biz.id })
        ]);
        
        setSales(salesData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setProducts(productsData);
        setWarehouses(warehousesData);
        setCustomers(customersData);
        setEmployees(employeesData);

        // Загружаем данные по реализации отдельно — не должны ломать основной поток
        try {
          const [consignmentProdData, consignmentSaleData] = await Promise.all([
            base44.entities.ConsignmentProduct.filter({ business_id: biz.id }),
            base44.entities.ConsignmentSale.filter({ business_id: biz.id })
          ]);
          setConsignmentProducts(consignmentProdData);
          setConsignmentSales(consignmentSaleData);
        } catch (_) {
          setConsignmentProducts([]);
          setConsignmentSales([]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = formData.is_consignment 
    ? consignmentProducts.find(p => p.id === formData.product_id)
    : products.find(p => p.id === formData.product_id);
  
  // Расчёты для выбранного товара
  const pairsSold = formData.boxes_sold * (selectedProduct?.pairs_per_box || 6);
  const itemsSold = pairsSold * 2;
  const actualSalePrice = formData.custom_sale_price ? parseFloat(formData.custom_sale_price) : (selectedProduct?.sale_price || 0);
  const totalAmount = formData.boxes_sold * actualSalePrice;
  const ownerPrice = formData.is_consignment ? (selectedProduct?.owner_price || 0) : (selectedProduct?.purchase_price || 0);
  const profit = formData.boxes_sold * (actualSalePrice - ownerPrice);
  const ownerAmount = formData.is_consignment ? formData.boxes_sold * ownerPrice : 0;

  // Stock validation — block sale if requested boxes exceed available stock
  const isOverStock = selectedProduct && (parseInt(formData.boxes_sold) || 0) > (selectedProduct.boxes_in_stock || 0);

  const handleSave = async () => {
    if (!formData.product_id || formData.boxes_sold < 1) return;
    if (selectedProduct && (parseInt(formData.boxes_sold) || 0) > (selectedProduct.boxes_in_stock || 0)) {
      alert(`⚠️ Недостаточно товара на складе!\n\nТовар: ${selectedProduct?.brand || ''} ${selectedProduct?.model || ''}\nЗапрошено: ${formData.boxes_sold} кор.\nВ наличии: ${selectedProduct.boxes_in_stock || 0} кор.\n\nПродажа невозможна.`);
      return;
    }

    // Клиент обязателен — имя + телефон. Если не выбран из базы, создаём нового.
    const hasExistingCustomer = !!formData.customer_id;
    const hasNewCustomerData = !hasExistingCustomer && (formData.customer_name || '').trim() && (formData.customer_phone || '').trim();
    if (!hasExistingCustomer && !hasNewCustomerData) {
      alert('⚠️ Укажите клиента!\n\nВведите имя и фамилию, а также номер телефона покупателя. Без клиента продажа невозможна.');
      return;
    }

    // Резолвим клиента: существующий или создаём нового
    // Защита от дублей: если не выбран существующий — сначала ищем по телефону
    const _normPhone = (p = '') => String(p).replace(/\D/g, '');
    let resolvedCustomerId = formData.customer_id || '';
    let resolvedCustomerName = formData.customer_name || '';
    let resolvedCustomerPhone = formData.customer_phone || '';
    if (!hasExistingCustomer) {
      const phoneNorm = _normPhone(formData.customer_phone);
      const existingByPhone = phoneNorm.length >= 7
        ? customers.find(c => _normPhone(c.phone) === phoneNorm)
        : null;
      if (existingByPhone) {
        // Уже есть такой клиент — используем его, не создаём дубль
        resolvedCustomerId = existingByPhone.id;
        resolvedCustomerName = existingByPhone.name;
        resolvedCustomerPhone = existingByPhone.phone || '';
      } else {
        try {
          const empForCustomer = window.__barakatEmployee;
          const userForCustomer = await base44.auth.me();
          const newCustomer = await base44.entities.Customer.create({
            business_id: business.id,
            name: (formData.customer_name || '').trim(),
            phone: (formData.customer_phone || '').trim(),
            address: formData.customer_address || '',
            total_debt: 0,
            total_paid: 0,
            purchase_count: 0,
            added_by_employee_id: empForCustomer?.id || '',
            added_by_employee_name: empForCustomer?.name || '',
            added_by_email: userForCustomer.email,
            added_by_role: empForCustomer ? (empForCustomer.is_admin ? 'admin' : 'employee') : 'owner'
          });
          resolvedCustomerId = newCustomer.id;
          resolvedCustomerName = newCustomer.name;
          resolvedCustomerPhone = newCustomer.phone || (formData.customer_phone || '').trim();
        } catch (e) {
          console.error('Error creating customer:', e);
          alert('Не удалось сохранить клиента. Проверьте имя и номер телефона.');
          return;
        }
      }
    } else {
      const existing = customers.find(c => c.id === resolvedCustomerId);
      if (existing) {
        resolvedCustomerName = existing.name;
        resolvedCustomerPhone = existing.phone || '';
      }
    }

    // === Продажа товара на реализации (чужого товара) ===
    if (formData.is_consignment) {
      setSaving(true);
      try {
        const user = await base44.auth.me();
        const emp = window.__barakatEmployee;
        const consignmentSaleData = {
          business_id: business.id,
          product_id: formData.product_id,
          seller_email: user.email,
          seller_name: emp?.name || user.full_name || user.email,
          owner_name: selectedProduct?.owner_name || '',
          owner_email: selectedProduct?.owner_email || '',
          brand: selectedProduct?.brand || '',
          model: selectedProduct?.model || '',
          boxes_sold: parseInt(formData.boxes_sold),
          pairs_sold: pairsSold,
          items_sold: itemsSold,
          owner_price: selectedProduct?.owner_price || 0,
          sale_price: actualSalePrice,
          total_amount: totalAmount,
          seller_profit: profit,
          owner_amount: ownerAmount,
          sale_date: new Date().toISOString(),
          customer_id: resolvedCustomerId,
          customer_name: resolvedCustomerName,
          is_cancelled: false
        };
        const created = await base44.entities.ConsignmentSale.create(consignmentSaleData);
        const newStock = Math.max(0, (selectedProduct.boxes_in_stock || 0) - parseInt(formData.boxes_sold));
        await base44.entities.ConsignmentProduct.update(formData.product_id, { boxes_in_stock: newStock });
        await base44.entities.ActivityLog.create({
          business_id: business.id,
          action_type: 'create',
          entity_type: 'ConsignmentSale',
          entity_id: created.id,
          entity_data: consignmentSaleData,
          user_email: user.email,
          user_name: emp?.name || user.full_name || user.email,
          description: `Реализация: ${selectedProduct?.brand} ${selectedProduct?.model}, ${formData.boxes_sold} кор. × ${actualSalePrice.toLocaleString()} с. = ${totalAmount.toLocaleString()} с. (прибыль: ${profit.toLocaleString()} с., владельцу: ${ownerAmount.toLocaleString()} с.)`
        });
        // Увеличиваем счётчик покупок клиента
        try {
          const cust = customers.find(c => c.id === resolvedCustomerId);
          await base44.entities.Customer.update(resolvedCustomerId, {
            purchase_count: (cust?.purchase_count || 0) + 1
          });
        } catch (_) {}

        // Уведомление клиенту по выбранным каналам
        if (notifyChannels.length > 0) {
          const custObj = customers.find(c => c.id === resolvedCustomerId) || { phone: resolvedCustomerPhone, email: '', use_phone_for_all: true };
          const message = buildSaleMessage({
            customerName: resolvedCustomerName,
            businessName: business.name,
            items: [{ name: `${selectedProduct?.brand || ''} ${selectedProduct?.model || ''}`, boxes: parseInt(formData.boxes_sold), total: totalAmount }],
            totalAmount,
            paidAmount: totalAmount,
            remainingDebt: 0,
            dueDate: '',
            isDebt: false
          });
          notifyCustomerChannels({ customer: custObj, channels: notifyChannels, message, emailSubject: `Ваша покупка — ${business.name}` });
        }

        await loadData();
        clearSingleDraft();
        setDialogOpen(false);
        setFormData({ ...DEFAULT_SALE_FORM });
        setProductSearch('');
      } catch (e) {
        console.error('Error saving consignment sale:', e);
      } finally {
        setSaving(false);
      }
      return;
    }
    
    // === Обычная продажа (свой товар) ===
    setSaving(true);
    const partialPay = formData.is_debt ? parseFloat(formData.partial_payment) || 0 : 0;
    const remainingDebt = totalAmount - partialPay;
    
    const emp = window.__barakatEmployee;
    const currentUser = await base44.auth.me();
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
      customer_id: resolvedCustomerId,
      customer_name: resolvedCustomerName,
      customer_address: formData.customer_address || '',
      payment_due_date: formData.is_debt ? (paymentDueDate || null) : null,
      partial_payment: partialPay,
      seller_email: currentUser.email,
      seller_name: emp?.name || currentUser.full_name || currentUser.email
    };

    // Optimistic UI update
    const optimisticSale = { ...saleData, id: 'temp_' + Date.now() };
    setSales(prev => [optimisticSale, ...prev]);

    try {
      const createdSale = await base44.entities.Sale.create(saleData);

      // Логируем создание продажи
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: 'create',
        entity_type: 'Sale',
        entity_id: createdSale.id,
        entity_data: saleData,
        user_email: currentUser.email,
        user_name: emp?.name || currentUser.full_name || currentUser.email,
        description: `Продажа: ${selectedProduct?.brand} ${selectedProduct?.model}, ${saleData.boxes_sold} кор. × ${saleData.sale_price?.toLocaleString()} с. = ${saleData.total_amount?.toLocaleString()} с.${saleData.is_debt ? ' (в долг)' : ''}`
      });

      // Update product stock
      const newStock = Math.max(0, (selectedProduct.boxes_in_stock || 0) - parseInt(formData.boxes_sold));
      await base44.entities.Product.update(formData.product_id, { boxes_in_stock: newStock });

      // Обновляем статистику клиента (счётчик покупок — всегда; долг — если продажа в долг)
      const customerRec = customers.find(c => c.id === resolvedCustomerId) || { total_debt: 0, total_paid: 0, purchase_count: 0, name: resolvedCustomerName, phone: resolvedCustomerPhone, debt_limit: null };
      if (formData.is_debt) {
        // Проверяем лимит долга
        const newTotalDebt = (customerRec.total_debt || 0) + remainingDebt;
        if (customerRec.debt_limit != null && newTotalDebt > customerRec.debt_limit) {
          setSaving(false);
          setSales(prev => prev.filter(s => !s.id?.startsWith('temp_')));
          alert(`⚠️ Превышен лимит долга клиента "${customerRec.name}"!\nЛимит: ${customerRec.debt_limit.toLocaleString()} с.\nТекущий долг: ${(customerRec.total_debt||0).toLocaleString()} с.\nНовый долг составит: ${newTotalDebt.toLocaleString()} с.`);
          return;
        }
        await base44.entities.Customer.update(resolvedCustomerId, {
          total_debt: (customerRec.total_debt || 0) + remainingDebt,
          total_paid: (customerRec.total_paid || 0) + partialPay,
          purchase_count: (customerRec.purchase_count || 0) + 1
        });

        // Если была частичная оплата — создаём запись в DebtPayment для истории
        if (partialPay > 0) {
          await base44.entities.DebtPayment.create({
            business_id: business.id,
            customer_id: resolvedCustomerId,
            sale_id: createdSale.id,
            amount: partialPay,
            note: 'Частичная оплата при продаже',
            payment_date: new Date().toISOString()
          });
        }

      } else {
        // Наличная продажа — увеличиваем счётчик покупок и сумму оплат
        await base44.entities.Customer.update(resolvedCustomerId, {
          purchase_count: (customerRec.purchase_count || 0) + 1,
          total_paid: (customerRec.total_paid || 0) + totalAmount
        });
      }

      // Отправляем уведомление клиенту по выбранным каналам
      if (notifyChannels.length > 0) {
        const paidNow = formData.is_debt ? partialPay : totalAmount;
        const remaining = formData.is_debt ? remainingDebt : 0;
        const custObj = customers.find(c => c.id === resolvedCustomerId) || {
          phone: resolvedCustomerPhone, name: resolvedCustomerName, email: '',
          use_phone_for_all: true
        };
        const message = buildSaleMessage({
          customerName: resolvedCustomerName,
          businessName: business.name,
          items: [{ name: selectedProduct ? `${selectedProduct.brand} ${selectedProduct.model}` : 'Товар', boxes: parseInt(formData.boxes_sold), total: totalAmount }],
          totalAmount,
          paidAmount: paidNow,
          remainingDebt: remaining,
          dueDate: formData.is_debt ? paymentDueDate : '',
          isDebt: formData.is_debt
        });
        notifyCustomerChannels({ customer: custObj, channels: notifyChannels, message, emailSubject: `Ваша покупка — ${business.name}` });
      }

      await loadData();
      clearSingleDraft();
      setDialogOpen(false);
      setFormData({ ...DEFAULT_SALE_FORM });
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

  // Если у сотрудника view_own_sales_only — показываем только его продажи
  const currentUserEmail = window.__barakatEmployee?.user_email || null;

  // Объединяем обычные продажи и продажи на реализации
  const unifiedSales = [
    ...sales.map(s => ({ ...s, _isConsignment: false })),
    ...consignmentSales.map(s => ({ ...s, _isConsignment: true, profit: s.seller_profit || 0, is_debt: false }))
  ];
  // Фильтрация продаж для отображения в списке (все, включая отменённые)
  let filteredSales = unifiedSales.filter(sale => {
    // Если включен режим "только свои продажи"
    if (can('view_own_sales_only') && !can('view_sales') && currentUserEmail) {
      if (sale.created_by !== currentUserEmail) return false;
    }
    const product = sale._isConsignment 
      ? consignmentProducts.find(p => p.id === sale.product_id)
      : products.find(p => p.id === sale.product_id);
    const customer = customers.find(c => c.id === sale.customer_id);
    const q = search.toLowerCase().trim();
    const fullProductName = `${product?.brand || ''} ${product?.model || ''}`.toLowerCase();
    const matchesSearch = !q ||
      fullProductName.includes(q) ||
      product?.brand?.toLowerCase().includes(q) ||
      product?.model?.toLowerCase().includes(q) ||
      customer?.name?.toLowerCase().includes(q) ||
      sale.customer_name?.toLowerCase().includes(q);
    const matchesWarehouse = filterWarehouse === 'all' || sale.warehouse_id === filterWarehouse;
    const matchesCustomer = filterCustomer === 'all' || sale.customer_id === filterCustomer;
    const matchesPaymentType = filterPaymentType === 'all' || (filterPaymentType === 'debt' ? !!sale.is_debt : !sale.is_debt);
    const saleSellerEmail = sale.seller_email || '';
    const matchesEmployee = filterEmployee === 'all' || saleSellerEmail === filterEmployee;
    
    let matchesDate = true;
    if (dateRange?.from) {
      const saleDate = parseISO(sale.sale_date || sale.created_date);
      matchesDate = isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
    }
    
    let matchesTime = true;
    if (filterTime) {
      const saleDate = parseISO(sale.sale_date || sale.created_date);
      const saleHHMM = `${String(saleDate.getHours()).padStart(2,'0')}:${String(saleDate.getMinutes()).padStart(2,'0')}`;
      matchesTime = saleHHMM === filterTime;
    }
    
    return matchesSearch && matchesWarehouse && matchesDate && matchesCustomer && matchesTime && matchesEmployee && matchesPaymentType;
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
  const consignmentStats = activeSales.filter(s => s._isConsignment).reduce((acc, s) => ({
    profit: acc.profit + (s.seller_profit || 0),
    ownerAmount: acc.ownerAmount + (s.owner_amount || 0),
    count: acc.count + 1
  }), { profit: 0, ownerAmount: 0, count: 0 });

  // Поиск товаров для выбора (поиск по бренду+модели вместе или по отдельности)
  const allAvailableProducts = [
    ...products.filter(p => (p.boxes_in_stock || 0) > 0).map(p => ({ ...p, _isConsignment: false })),
    ...consignmentProducts.filter(p => (p.boxes_in_stock || 0) > 0).map(p => ({ ...p, _isConsignment: true }))
  ];
  const filteredProducts = allAvailableProducts.filter(p => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${p.brand || ''} ${p.model || ''}`.toLowerCase();
    return fullName.includes(q) || p.brand?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q);
  });

  if (!isReady) return <PageLoader message="Загрузка..." />;
  if (!can('view_sales')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Нет доступа</h3>
            <p className="text-slate-600">У вас нет прав для просмотра продаж.<br/>Обратитесь к владельцу бизнеса.</p>
          </div>
        </div>
      </div>
    );
  }
  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="space-y-6">
      <PageHeader 
        title={t(lang,'sales_title')}
        subtitle={`${filteredSales.length} ${t(lang,'dash_sales_count')}`}
        actions={
          can('add_sales') && (
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm" className="gap-1.5 text-xs border-indigo-300 text-indigo-600 hover:bg-indigo-50 px-2 sm:px-3">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">1 товар</span>
              </Button>
              <Button onClick={() => setMultiDialogOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs px-2 sm:px-3">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Продажа</span>
              </Button>
            </div>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Box className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-slate-500 truncate">{t(lang,'sales_boxes_label')}</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{totals.boxes}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-slate-500 truncate">{t(lang,'sales_pairs_label')}</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{totals.pairs}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 hidden sm:block lg:block">
          <div className="flex items-center gap-1.5 mb-1">
            <Hash className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-slate-500 truncate">{t(lang,'sales_items_label')}</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{totals.items}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-500 truncate">{t(lang,'sales_revenue')}</span>
          </div>
          {can('view_revenue') ? (
            <p className="text-xl font-bold text-slate-900">{totals.revenue.toLocaleString()}</p>
          ) : (
            <p className="text-xl font-bold text-slate-300">•••</p>
          )}
        </div>
        <div className="col-span-1 lg:col-span-1 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-500 truncate">{t(lang,'sales_profit')}</span>
          </div>
          {can('view_sale_profit') ? (
            <p className="text-xl font-bold text-emerald-600">{totals.profit.toLocaleString()}</p>
          ) : (
            <p className="text-xl font-bold text-slate-300">•••</p>
          )}
        </div>
      </div>

      {/* Consignment stats */}
      {consignmentStats.count > 0 && can('view_sale_profit') && (
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 border border-teal-200 dark:border-teal-800 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-teal-600" />
            <span className="font-medium text-teal-700 dark:text-teal-300">Реализация: {consignmentStats.count} продаж</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Ваша прибыль:</span>
            <span className="font-bold text-emerald-600">+{consignmentStats.profit.toLocaleString()} с.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Владельцам товаров:</span>
            <span className="font-bold text-amber-600">{consignmentStats.ownerAmount.toLocaleString()} с.</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-2">
        {/* Quick period buttons */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { key: 'today', label: 'Сегодня' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
          ].map(f => (
            <button key={f.key} onClick={() => setSalesQuickPeriod(f.key)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white text-slate-600 border-slate-200 hover:border-indigo-400 transition-all">
              {f.label}
            </button>
          ))}
          <DateFilter dateRange={dateRange} onDateRangeChange={r => { setDateRange(r); setSalesPage(1); }} />
          <ViewToggle view={view} onChange={setView} enableCustomersView />
          <span className="ml-auto text-xs text-slate-400">{filteredSales.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder={t(lang,'sales_search')}
            className="w-full sm:w-56"
          />
          <div className="flex flex-wrap gap-1.5">
          <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
            <SelectTrigger className="w-28 h-8 text-xs">
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
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boxes">{t(lang,'sales_boxes')}</SelectItem>
              <SelectItem value="pairs">{t(lang,'sales_pairs')}</SelectItem>
              <SelectItem value="items">{t(lang,'sales_items')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative customer-filter-dropdown">
            <div
              className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer w-32 text-xs h-8"
              onClick={() => setShowCustomerDropdown(v => !v)}
            >
              <span className="flex-1 truncate text-slate-700">
                {filterCustomer === 'all' ? 'Клиенты' : customers.find(c => c.id === filterCustomer)?.name || 'Клиент'}
              </span>
              {filterCustomer !== 'all' && (
                <button onClick={e => { e.stopPropagation(); setFilterCustomer('all'); setFilterCustomerSearch(''); setSalesPage(1); }} className="text-slate-400">✕</button>
              )}
            </div>
            {showCustomerDropdown && (
              <div className="absolute z-50 top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg">
                <div className="p-2">
                  <input autoFocus className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-400" placeholder="Поиск клиента..." value={filterCustomerSearch} onChange={e => setFilterCustomerSearch(e.target.value)} onClick={e => e.stopPropagation()} />
                </div>
                <div className="max-h-40 overflow-y-auto pb-1">
                  <div className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 ${filterCustomer === 'all' ? 'text-indigo-600 font-medium' : 'text-slate-700'}`} onClick={() => { setFilterCustomer('all'); setFilterCustomerSearch(''); setShowCustomerDropdown(false); setSalesPage(1); }}>Все клиенты</div>
                  {customers.filter(c => sales.some(s => s.customer_id === c.id)).filter(c => !filterCustomerSearch || c.name?.toLowerCase().includes(filterCustomerSearch.toLowerCase())).map(c => (
                    <div key={c.id} className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 ${filterCustomer === c.id ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-slate-700'}`} onClick={() => { setFilterCustomer(c.id); setFilterCustomerSearch(''); setShowCustomerDropdown(false); setSalesPage(1); }}>{c.name}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Select value={filterEmployee} onValueChange={(v) => { setFilterEmployee(v); setSalesPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Сотрудник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.user_email}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPaymentType} onValueChange={(v) => { setFilterPaymentType(v); setSalesPage(1); }}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Оплата" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все оплаты</SelectItem>
              <SelectItem value="cash">Наличные</SelectItem>
              <SelectItem value="debt">В долг</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">По дате</SelectItem>
              <SelectItem value="amount">По сумме</SelectItem>
              <SelectItem value="profit">По прибыли</SelectItem>
              <SelectItem value="boxes">По коробкам</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      {/* Sales List/Grid */}
      {view === 'customers' ? (
        <CustomerGroupedView
          sales={activeSales}
          customers={customers}
          products={products}
          consignmentProducts={consignmentProducts}
          lang={lang}
          can={can}
          displayUnit={displayUnit}
          onSelectCustomer={setSelectedCustomerGroup}
        />
      ) : view === 'list' ? (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-h-[70vh] overflow-auto custom-scroll">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
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
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Продавец</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale, idx) => {
                const globalIdx = idx;
                const product = sale._isConsignment ? consignmentProducts.find(p => p.id === sale.product_id) : products.find(p => p.id === sale.product_id);
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
                          {product && (
                            <p className="text-xs text-slate-400">
                              {[product.color, product.product_type, product.size_from && product.size_to ? `${product.size_from}–${product.size_to}` : null].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {sale.is_cancelled && <span className="text-xs text-red-500">{t(lang,'sales_cancelled')}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-600">{displayQty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {sale.total_amount?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {can('view_sale_profit') ? `+${sale.profit?.toLocaleString()} с.` : '••• с.'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${sale.is_debt ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {sale.is_debt ? `${t(lang,'sales_in_debt')}${can('view_sale_customer') && customer?.name ? ` (${customer.name})` : ''}` : t(lang,'sales_cash')}
                        </span>
                        {sale._isConsignment && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700">РЕАЛИЗ.</span>}
                      </div>
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
          {filteredSales.map(sale => {
            const product = sale._isConsignment ? consignmentProducts.find(p => p.id === sale.product_id) : products.find(p => p.id === sale.product_id);
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
                        {product && (
                          <p className="text-xs text-slate-400">
                            {[product.color, product.product_type, product.size_from && product.size_to ? `${product.size_from}–${product.size_to}` : null].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-900 text-sm">{sale.total_amount?.toLocaleString()} с.</p>
                        <p className="text-xs text-emerald-600">{can('view_sale_profit') ? `+${sale.profit?.toLocaleString()} с.` : '••• с.'}</p>
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
                    {can('view_sale_customer') && (customer?.name || sale.customer_name) && sale.customer_name !== 'Неизвестный' && (
                      <p className="text-xs text-slate-500 mt-1">👤 {customer?.name || sale.customer_name}</p>
                    )}
                    {(sale.seller_name || sale.seller_email) && (
                      <p className="text-xs text-slate-400 mt-0.5">🛍️ {sale.seller_name || sale.seller_email}</p>
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
        </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedSales.map(sale => {
          const product = sale._isConsignment ? consignmentProducts.find(p => p.id === sale.product_id) : products.find(p => p.id === sale.product_id);
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
                  {product && (
                   <p className="text-xs text-slate-400 truncate">
                     {[product.color, product.product_type, product.size_from && product.size_to ? `${product.size_from}–${product.size_to}` : null].filter(Boolean).join(' · ')}
                   </p>
                  )}
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
                {can('view_sale_profit') && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Прибыль:</span>
                  <span className="font-semibold text-emerald-600">+{sale.profit?.toLocaleString()} с.</span>
                </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{displayUnit === 'boxes' ? 'Кор.' : displayUnit === 'pairs' ? 'Пар' : 'Шт'}:</span>
                  <span className="font-semibold text-indigo-600">{displayQty}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${sale.is_debt ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {sale.is_debt ? `${t(lang,'sales_in_debt')}${can('view_sale_customer') && customer?.name ? ` (${customer.name})` : ''}` : t(lang,'sales_cash')}
                  </span>
                  {(sale.seller_name || sale.seller_email) && (
                    <span className="text-xs text-slate-400 truncate">🛍️ {sale.seller_name || sale.seller_email}</span>
                  )}
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
          product={selectedSale._isConsignment ? (consignmentProducts.find(p => p.id === selectedSale.product_id) || products.find(p => p.id === selectedSale.product_id)) : products.find(p => p.id === selectedSale.product_id)}
          customer={customers.find(c => c.id === selectedSale.customer_id)}
          onClose={() => setSelectedSale(null)}
          onUpdated={() => { loadData(); setSelectedSale(null); }}
        />
      )}

      {/* Customer purchases detail (all products bought in period) */}
      {selectedCustomerGroup && (
        <CustomerPurchasesDialog
          group={selectedCustomerGroup}
          products={products}
          consignmentProducts={consignmentProducts}
          can={can}
          displayUnit={displayUnit}
          lang={lang}
          onClose={() => setSelectedCustomerGroup(null)}
          onSelectSale={(sale) => { setSelectedCustomerGroup(null); setSelectedSale(sale); }}
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
                        setFormData({ ...formData, product_id: product.id, is_consignment: product._isConsignment, custom_sale_price: '' });
                        setProductSearch(`${product.brand} ${product.model}`);
                      }}
                      className={`p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 ${formData.product_id === product.id ? (product._isConsignment ? 'bg-teal-50' : 'bg-indigo-50') : ''}`}
                    >
                      {product.photo_url ? (
                        <img src={product.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{product.brand} {product.model}</p>
                          {product._isConsignment && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700">РЕАЛИЗАЦИЯ</span>}
                        </div>
                        <p className="text-xs text-slate-400">
                          {[product.color, product.size_from && product.size_to ? `${product.size_from}–${product.size_to}` : null].filter(Boolean).join(' · ')}
                        </p>
                        {product._isConsignment ? (
                          <p className="text-sm text-slate-500">
                            {product.boxes_in_stock} кор. • 👤 {product.owner_name} • +{((product.sale_price || 0) - (product.owner_price || 0)).toLocaleString()} с./кор
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">
                            {product.boxes_in_stock} {t(lang,'sales_boxes_label').toLowerCase()} • {product.sale_price?.toLocaleString()} с.
                          </p>
                        )}
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
              <div className={`p-4 rounded-xl ${formData.is_consignment ? 'bg-teal-50' : 'bg-indigo-50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {selectedProduct.photo_url ? (
                    <img src={selectedProduct.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{selectedProduct.brand} {selectedProduct.model}</p>
                      {formData.is_consignment && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-200 text-teal-800">РЕАЛИЗАЦИЯ</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {[selectedProduct.color, selectedProduct.size_from && selectedProduct.size_to ? `${selectedProduct.size_from}–${selectedProduct.size_to}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {formData.is_consignment ? (
                      <>
                        <p className="text-sm text-slate-600">👤 Владелец: {selectedProduct.owner_name}</p>
                        <p className="text-sm text-slate-600">На складе: {selectedProduct.boxes_in_stock} кор.</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-600">
                        {t(lang,'sales_on_stock')}: {selectedProduct.boxes_in_stock} {t(lang,'sales_boxes_label').toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>
                {formData.is_consignment && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-200">
                    <div className="text-center"><p className="text-xs text-slate-500">Цена владельца</p><p className="font-semibold text-amber-600">{selectedProduct.owner_price?.toLocaleString()} с.</p></div>
                    <div className="text-center"><p className="text-xs text-slate-500">Цена продажи</p><p className="font-semibold text-slate-900">{actualSalePrice.toLocaleString()} с.</p></div>
                    <div className="text-center"><p className="text-xs text-slate-500">Прибыль/кор</p><p className="font-semibold text-emerald-600">+{(actualSalePrice - (selectedProduct.owner_price || 0)).toLocaleString()} с.</p></div>
                  </div>
                )}
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
                  className={`mt-1.5 ${isOverStock ? 'border-red-500 animate-pulse-border text-red-600 font-bold' : ''}`}
                  inputMode="numeric"
                />
                {isOverStock ? (
                  <p className="text-xs text-red-600 font-semibold mt-1 animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Нет {formData.boxes_sold} кор. — есть только {selectedProduct.boxes_in_stock} кор.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    {t(lang,'sales_on_stock')}: {selectedProduct?.boxes_in_stock || 0} {t(lang,'sales_boxes_label').toLowerCase()}
                  </p>
                )}
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
                {can('view_sale_profit') && (
                <div>
                  <p className="text-sm text-slate-500">{t(lang,'sales_profit')}</p>
                  <p className="text-lg font-semibold text-emerald-600">+{profit.toLocaleString()} с.</p>
                </div>
                )}
                {formData.is_consignment && can('view_sale_profit') && (
                <div>
                  <p className="text-sm text-slate-500">Владельцу</p>
                  <p className="text-lg font-semibold text-amber-600">{ownerAmount.toLocaleString()} с.</p>
                </div>
                )}
              </div>
            )}

            {/* Debt Sale */}
            <div className={`flex items-center gap-3 p-4 rounded-xl ${formData.is_consignment ? 'bg-slate-100 opacity-60' : 'bg-orange-50'}`}>
              <Checkbox 
                id="is_debt"
                checked={formData.is_debt}
                disabled={formData.is_consignment}
                onCheckedChange={(checked) => setFormData({ ...formData, is_debt: checked })}
              />
              <label htmlFor="is_debt" className="font-medium text-slate-900 cursor-pointer">
                {t(lang,'sales_debt_sale')}
                {formData.is_consignment && <span className="text-xs text-slate-400 ml-1">(недоступно для реализации)</span>}
              </label>
            </div>

            {/* Клиент (обязательно) */}
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Клиент (обязательно)</p>
              </div>
              <MandatoryCustomerPicker
                customers={customers}
                value={{ customer_id: formData.customer_id, name: formData.customer_name, phone: formData.customer_phone }}
                onChange={(v) => setFormData({ ...formData, customer_id: v.customer_id, customer_name: v.name, customer_phone: v.phone })}
              />
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
                <div className="mt-2">
                  <Label className="flex items-center gap-1">📅 Срок оплаты (необязательно)</Label>
                  <Input type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} className="mt-1.5" />
                </div>
              </div>
            )}
          </div>

          {/* Каналы уведомления клиенту */}
          <SaleNotifyChannels
            channels={notifyChannels}
            onChange={setNotifyChannels}
            customer={(() => {
              const c = customers.find(c => c.id === formData.customer_id);
              return c || { phone: formData.customer_phone, email: '', use_phone_for_all: true };
            })()}
          />

          {isOverStock && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700 font-semibold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Невозможно продать: запрошено {formData.boxes_sold} кор., а в наличии только {selectedProduct.boxes_in_stock} кор.!</span>
            </div>
          )}

          {hasSingleDraft && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              <Clock className="w-4 h-4 flex-shrink-0" />
              У вас есть незаконченный черновик этой продажи — данные восстановлены.
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetSingleSaleDraft}
              className="gap-1.5 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
              title="Сбросить все данные формы"
            >
              <Trash2 className="w-4 h-4" />
              Сбросить
            </Button>
            <Button
              variant="outline"
              onClick={saveSingleSaleDraft}
              className="gap-1.5 text-amber-600 hover:text-amber-700 border-amber-300 hover:bg-amber-50"
              title="Сохранить введённые данные как черновик"
            >
              <Clock className="w-4 h-4" />
              В черновик
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t(lang,'cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.product_id || formData.boxes_sold < 1 || isOverStock || (!formData.customer_id && (!(formData.customer_name || '').trim() || !(formData.customer_phone || '').trim()))}
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