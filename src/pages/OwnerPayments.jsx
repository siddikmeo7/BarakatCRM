import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, TrendingUp, Users, Loader2, Plus, CheckCircle, Clock, ArrowDownCircle, DollarSign, Merge, Trash2, Settings2, Search, ArrowUpDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import BackButton from '@/components/ui/BackButton';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import { useToast } from '@/components/ui/use-toast';

const SORT_OPTIONS = [
  { value: 'name', label: 'По имени (А→Я)' },
  { value: 'remaining_desc', label: 'По остатку (больше)' },
  { value: 'owed_desc', label: 'По к выплате (больше)' },
  { value: 'sales_desc', label: 'По кол-ву продаж' },
];

export default function OwnerPayments() {
  const { isOwner, employee } = useEmployeeAccess();
  const canManage = isOwner || employee?.is_admin;

  const { toast } = useToast();
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutOwner, setPayoutOwner] = useState('');
  const [payoutForm, setPayoutForm] = useState({ amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Управление разделом (только админ)
  const [sortBy, setSortBy] = useState('remaining_desc');
  const [query, setQuery] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');
  const [mergeSources, setMergeSources] = useState([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
      setBusiness(biz);
      const [saleData, payoutData, productData] = await Promise.all([
        base44.entities.ConsignmentSale.filter({ business_id: biz.id }),
        base44.entities.ConsignmentPayout.filter({ business_id: biz.id }),
        base44.entities.ConsignmentProduct.filter({ business_id: biz.id })
      ]);
      setSales(saleData.filter(s => !s.is_cancelled).sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date)));
      setPayouts(payoutData.sort((a, b) => new Date(b.payout_date || b.created_date) - new Date(a.payout_date || a.created_date)));
      setProducts(productData);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const ownerMap = {};
  sales.forEach(s => {
    const key = s.owner_name || 'Неизвестный владелец';
    if (!ownerMap[key]) ownerMap[key] = { name: key, email: s.owner_email || '', boxes: 0, owed: 0, paid: 0, salesCount: 0, profit: 0, revenue: 0 };
    ownerMap[key].boxes += s.boxes_sold || 0;
    ownerMap[key].owed += s.owner_amount || 0;
    ownerMap[key].profit += s.seller_profit || 0;
    ownerMap[key].revenue += s.total_amount || 0;
    ownerMap[key].salesCount += 1;
  });
  payouts.forEach(p => {
    const key = p.owner_name || 'Неизвестный владелец';
    if (!ownerMap[key]) ownerMap[key] = { name: key, email: p.owner_email || '', boxes: 0, owed: 0, paid: 0, salesCount: 0, profit: 0, revenue: 0 };
    ownerMap[key].paid += p.amount || 0;
  });

  const owners = useMemo(() => {
    let list = Object.values(ownerMap);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name, 'ru');
        case 'remaining_desc': return (b.owed - b.paid) - (a.owed - a.paid);
        case 'owed_desc': return b.owed - a.owed;
        case 'sales_desc': return b.salesCount - a.salesCount;
        default: return 0;
      }
    });
    return list;
  }, [sales, payouts, sortBy, query]);

  // Владельцы для объединения: все, у кого есть продажи, выплаты ИЛИ товары на
  // реализации — иначе владельца, у которого остались только товары, нельзя слить.
  const mergeOwners = useMemo(() => {
    const known = new Set(owners.map(o => o.name));
    const extra = {};
    products.forEach(p => {
      const key = p.owner_name || 'Неизвестный владелец';
      if (known.has(key)) return;
      if (!extra[key]) {
        extra[key] = { name: key, email: p.owner_email || '', salesCount: 0, owed: 0, paid: 0, boxes: 0, boxesInStock: 0 };
      }
      extra[key].boxesInStock += p.boxes_in_stock || 0;
    });
    return [...owners, ...Object.values(extra)].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [owners, products]);

  const totalOwed = owners.reduce((sum, o) => sum + o.owed, 0);
  const totalPaid = owners.reduce((sum, o) => sum + o.paid, 0);
  const totalRemaining = totalOwed - totalPaid;
  const totalProfit = owners.reduce((sum, o) => sum + o.profit, 0);
  const totalRevenue = owners.reduce((sum, o) => sum + o.revenue, 0);

  const ownerHistory = selectedOwner ? [
    ...sales.filter(s => (s.owner_name || '') === selectedOwner).map(s => ({ ...s, type: 'sale' })),
    ...payouts.filter(p => (p.owner_name || '') === selectedOwner).map(p => ({ ...p, type: 'payout' })),
  ].sort((a, b) => new Date(b.sale_date || b.payout_date || b.created_date) - new Date(a.sale_date || a.payout_date || a.created_date)) : [];

  const logActivity = async (actionType, description, entityData = {}) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: actionType,
        entity_type: 'ConsignmentOwner',
        entity_id: '',
        entity_data: entityData,
        user_email: user.email,
        user_name: window.__barakatEmployee?.name || user.full_name || user.email,
        description
      });
    } catch (_) {}
  };

  const handlePayoutSave = async () => {
    const amount = parseFloat(payoutForm.amount);
    if (!payoutOwner || !amount || amount <= 0) return;
    setSaving(true);
    try {
      const owner = owners.find(o => o.name === payoutOwner);
      await base44.entities.ConsignmentPayout.create({
        business_id: business.id,
        owner_name: payoutOwner,
        owner_email: owner?.email || '',
        amount: amount,
        payout_date: new Date().toISOString(),
        note: payoutForm.note || ''
      });
      await logActivity('create', `Выплата владельцу ${payoutOwner}: ${amount.toLocaleString()} с.`, { owner_name: payoutOwner, amount });
      setPayoutOpen(false);
      setPayoutForm({ amount: '', note: '' });
      setPayoutOwner('');
      await loadData();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setSaving(false);
    }
  };

  // Объединить владельцев: продажи, выплаты И товары на реализации источников
  // переносятся на целевого владельца, после чего источники исчезают из списка.
  const handleMerge = async () => {
    const sources = mergeSources.filter(n => n !== mergeTarget);
    if (!mergeTarget) {
      toast({ title: 'Выберите владельца', description: 'Укажите, кому перенести записи.', variant: 'destructive' });
      return;
    }
    if (sources.length === 0) {
      toast({ title: 'Нечего объединять', description: 'Отметьте хотя бы одного владельца, кроме целевого.', variant: 'destructive' });
      return;
    }
    const target = mergeOwners.find(o => o.name === mergeTarget);
    setBusy(true);
    try {
      const patch = { $set: { owner_name: mergeTarget, owner_email: target?.email || '' } };
      for (const srcName of sources) {
        const filter = { business_id: business.id, owner_name: srcName };
        await base44.entities.ConsignmentSale.updateMany(filter, patch);
        await base44.entities.ConsignmentPayout.updateMany(filter, patch);
        await base44.entities.ConsignmentProduct.updateMany(filter, patch);
      }
      await logActivity('update', `Объединение владельцев: ${sources.join(', ')} → ${mergeTarget}`, { target: mergeTarget, sources });
      toast({
        title: 'Владельцы объединены',
        description: `Записи ${sources.length === 1 ? `«${sources[0]}»` : `${sources.length} владельцев`} перенесены на «${mergeTarget}»: продажи, выплаты и товары.`
      });
      setMergeOpen(false);
      setMergeTarget('');
      setMergeSources([]);
      setManageOpen(false);
      setSelectedOwner(null);
      await loadData();
    } catch (e) {
      console.error('Merge error:', e);
      toast({ title: 'Ошибка объединения', description: e?.message || 'Не удалось перенести записи', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // Удалить владельца: удаляются все его продажи и выплаты в реализации.
  const handleDeleteOwner = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await base44.entities.ConsignmentSale.deleteMany({ business_id: business.id, owner_name: deleteTarget });
      await base44.entities.ConsignmentPayout.deleteMany({ business_id: business.id, owner_name: deleteTarget });
      await logActivity('delete', `Удалён владелец: ${deleteTarget} (со всеми продажами и выплатами)`, { owner_name: deleteTarget });
      setDeleteOpen(false);
      setDeleteTarget('');
      setManageOpen(false);
      setSelectedOwner(null);
      await loadData();
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setBusy(false);
    }
  };

  const toggleSource = (name) => {
    setMergeSources(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <BackButton />
      </div>
      <PageHeader
        title="Средства владельцев товаров"
        subtitle="Деньги к выплате поставщикам за реализованные товары"
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <Button onClick={() => setManageOpen(true)} size="sm" variant="outline" className="gap-1.5 text-xs">
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Управление</span>
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setPayoutOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Выплата</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-slate-500 truncate">К выплате</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{totalOwed.toLocaleString()} с.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-500 truncate">Выплачено</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{totalPaid.toLocaleString()} с.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-red-600" />
            <span className="text-xs text-slate-500 truncate">Остаток</span>
          </div>
          <p className="text-xl font-bold text-red-600">{totalRemaining.toLocaleString()} с.</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 shadow-sm border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-4 h-4 text-white" />
            <span className="text-xs text-emerald-50 truncate">Прибыль от реализации</span>
          </div>
          <p className="text-xl font-bold text-white">{totalProfit.toLocaleString()} с.</p>
          <p className="text-[10px] text-emerald-100 mt-0.5">Выручка: {totalRevenue.toLocaleString()} с.</p>
        </div>
      </div>

      {/* Поиск и сортировка */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск владельца по имени или email..." className="pl-9" />
        </div>
        <div className="relative">
          <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white appearance-none w-full sm:w-auto">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {owners.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Нет данных о выплатах. Продайте товар на реализации, чтобы увидеть задолженность.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {owners.map(owner => {
            const remaining = owner.owed - owner.paid;
            const isSelected = selectedOwner === owner.name;
            return (
              <div key={owner.name} className={`bg-white dark:bg-slate-900 rounded-xl border ${isSelected ? 'border-amber-400' : 'border-slate-100 dark:border-slate-800'} shadow-sm overflow-hidden`}>
                <div className="p-4" onClick={() => setSelectedOwner(isSelected ? null : owner.name)} role="button">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{owner.name}</p>
                        <p className="text-xs text-slate-400">{owner.salesCount} продаж · {owner.boxes} кор.{owner.email ? ` · ${owner.email}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Остаток к выплате</p>
                      <p className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{remaining.toLocaleString()} с.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-xs text-slate-500">К выплате</p>
                      <p className="font-semibold text-amber-700 dark:text-amber-400">{owner.owed.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <p className="text-xs text-slate-500">Выплачено</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">{owner.paid.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500">Продано кор.</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{owner.boxes}</p>
                    </div>
                    <div className="text-center p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                      <p className="text-xs text-slate-500">Прибыль</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">{owner.profit.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {canManage && remaining > 0 && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setPayoutOwner(owner.name); setPayoutOpen(true); }} className="flex-1 text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50">
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Выплатить {remaining.toLocaleString()} с.
                      </Button>
                    )}
                    {canManage && (
                      <>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setMergeTarget(owner.name); setMergeSources([]); setMergeOpen(true); }} className="text-xs h-8 border-blue-300 text-blue-700 hover:bg-blue-50">
                          <Merge className="w-3.5 h-3.5" /> Объединить
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDeleteTarget(owner.name); setDeleteOpen(true); }} className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-1.5 max-h-64 overflow-y-auto">
                    <p className="text-xs font-semibold text-slate-500 mb-1">История операций</p>
                    {ownerHistory.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                        <div className="flex items-center gap-2">
                          {item.type === 'sale' ? (
                            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <div>
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                              {item.type === 'sale' ? `${item.brand} ${item.model} · ${item.boxes_sold} кор.` : `Выплата${item.note ? ': ' + item.note : ''}`}
                            </p>
                            <p className="text-[10px] text-slate-400">{format(parseISO(item.sale_date || item.payout_date || item.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}</p>
                          </div>
                        </div>
                        <p className={`text-xs font-semibold ${item.type === 'sale' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {item.type === 'sale' ? '+' + (item.owner_amount || 0).toLocaleString() : '−' + (item.amount || 0).toLocaleString()} с.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Диалог выплаты */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Выплата владельцу товара</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Владелец</Label>
              <select value={payoutOwner} onChange={e => setPayoutOwner(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                <option value="">Выберите владельца</option>
                {owners.map(o => <option key={o.name} value={o.name}>{o.name} (остаток: {(o.owed - o.paid).toLocaleString()} с.)</option>)}
              </select>
            </div>
            <div>
              <Label>Сумма выплаты *</Label>
              <Input type="number" value={payoutForm.amount} onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })} placeholder="0" className="mt-1" />
              {payoutOwner && (() => {
                const o = owners.find(x => x.name === payoutOwner);
                return o ? <p className="text-xs text-slate-500 mt-1">Остаток к выплате: {(o.owed - o.paid).toLocaleString()} с.</p> : null;
              })()}
            </div>
            <div>
              <Label>Примечание</Label>
              <Input value={payoutForm.note} onChange={e => setPayoutForm({ ...payoutForm, note: e.target.value })} placeholder="Необязательно" className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPayoutOpen(false)}>Отмена</Button>
            <Button onClick={handlePayoutSave} disabled={saving || !payoutOwner || !payoutForm.amount} className="bg-amber-600 hover:bg-amber-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Выплатить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог управления: объединение + удаление */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Управление владельцами</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Merge className="w-4 h-4 text-blue-600" /> Объединить владельцев
              </div>
              <p className="text-xs text-slate-500">Перенести продажи, выплаты и товары на реализации нескольких владельцев на одного. Суммы автоматически сложатся.</p>
              <Button size="sm" variant="outline" className="w-full" onClick={() => { setManageOpen(false); setMergeOpen(true); }}>
                Открыть объединение
              </Button>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Trash2 className="w-4 h-4 text-red-600" /> Удалить владельца
              </div>
              <p className="text-xs text-slate-500">Удалить владельца вместе со всеми его продажами и выплатами. Действие необратимо.</p>
              <Button size="sm" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50" onClick={() => { setManageOpen(false); setDeleteOpen(true); }}>
                Открыть удаление
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог объединения */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Объединить владельцев</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Кому перенести (целевой владелец)</Label>
              <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                <option value="">Выберите владельца</option>
                {mergeOwners.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Какие владельцы переносятся</Label>
              <div className="mt-1 max-h-56 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                {mergeOwners.filter(o => o.name !== mergeTarget).map(o => (
                  <label key={o.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <input type="checkbox" checked={mergeSources.includes(o.name)} onChange={() => toggleSource(o.name)} className="w-4 h-4 accent-amber-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white truncate">{o.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {o.salesCount} продаж · остаток {(o.owed - o.paid).toLocaleString()} с.
                        {o.boxesInStock ? ` · ${o.boxesInStock} кор. на реализации` : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {mergeSources.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">Выбрано: {mergeSources.length}. Все записи будут перенесены на «{mergeTarget || '...'}».</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMergeOpen(false)}>Отмена</Button>
            <Button onClick={handleMerge} disabled={busy || !mergeTarget || mergeSources.length === 0} className="bg-blue-600 hover:bg-blue-700">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Объединить (${mergeSources.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Удалить владельца</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Владелец</Label>
              <select value={deleteTarget} onChange={e => setDeleteTarget(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                <option value="">Выберите владельца</option>
                {owners.map(o => <option key={o.name} value={o.name}>{o.name} (остаток: {(o.owed - o.paid).toLocaleString()} с.)</option>)}
              </select>
            </div>
            {deleteTarget && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-300">
                  Будут безвозвратно удалены все продажи и выплаты владельца «{deleteTarget}». Продажи останутся в общей истории как отменённые записи не будут — данные исчезнут. Рекомендуется сначала объединить, если владелец — дубликат.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Отмена</Button>
            <Button onClick={handleDeleteOwner} disabled={busy || !deleteTarget} className="bg-red-600 hover:bg-red-700">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Удалить безвозвратно'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}