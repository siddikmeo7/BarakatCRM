import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, TrendingUp, Users, Loader2, Plus, CheckCircle, Clock, ArrowDownCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function OwnerPayments() {
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutOwner, setPayoutOwner] = useState('');
  const [payoutForm, setPayoutForm] = useState({ amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

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
        const [saleData, payoutData] = await Promise.all([
          base44.entities.ConsignmentSale.filter({ business_id: biz.id }),
          base44.entities.ConsignmentPayout.filter({ business_id: biz.id })
        ]);
        setSales(saleData.filter(s => !s.is_cancelled).sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date)));
        setPayouts(payoutData.sort((a, b) => new Date(b.payout_date || b.created_date) - new Date(a.payout_date || a.created_date)));
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const ownerMap = {};
  sales.forEach(s => {
    const key = s.owner_name || 'Неизвестный владелец';
    if (!ownerMap[key]) ownerMap[key] = { name: key, email: s.owner_email || '', boxes: 0, owed: 0, paid: 0, salesCount: 0 };
    ownerMap[key].boxes += s.boxes_sold || 0;
    ownerMap[key].owed += s.owner_amount || 0;
    ownerMap[key].salesCount += 1;
  });
  payouts.forEach(p => {
    const key = p.owner_name || 'Неизвестный владелец';
    if (!ownerMap[key]) ownerMap[key] = { name: key, email: p.owner_email || '', boxes: 0, owed: 0, paid: 0, salesCount: 0 };
    ownerMap[key].paid += p.amount || 0;
  });
  const owners = Object.values(ownerMap);

  const totalOwed = owners.reduce((sum, o) => sum + o.owed, 0);
  const totalPaid = owners.reduce((sum, o) => sum + o.paid, 0);
  const totalRemaining = totalOwed - totalPaid;

  const ownerHistory = selectedOwner ? [
    ...sales.filter(s => (s.owner_name || '') === selectedOwner).map(s => ({ ...s, type: 'sale' })),
    ...payouts.filter(p => (p.owner_name || '') === selectedOwner).map(p => ({ ...p, type: 'payout' })),
  ].sort((a, b) => new Date(b.sale_date || b.payout_date || b.created_date) - new Date(a.sale_date || a.payout_date || a.created_date)) : [];

  const handlePayoutSave = async () => {
    const amount = parseFloat(payoutForm.amount);
    if (!payoutOwner || !amount || amount <= 0) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const owner = owners.find(o => o.name === payoutOwner);
      await base44.entities.ConsignmentPayout.create({
        business_id: business.id,
        owner_name: payoutOwner,
        owner_email: owner?.email || '',
        amount: amount,
        payout_date: new Date().toISOString(),
        note: payoutForm.note || ''
      });
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: 'create',
        entity_type: 'ConsignmentPayout',
        entity_id: '',
        entity_data: { owner_name: payoutOwner, amount },
        user_email: user.email,
        description: `Выплата владельцу ${payoutOwner}: ${amount.toLocaleString()} с.`
      });
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Средства владельцев товаров"
        subtitle="Деньги к выплате поставщикам за реализованные товары"
        actions={
          <Button onClick={() => setPayoutOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Выплата</span>
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2">
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
                        <p className="text-xs text-slate-400">{owner.salesCount} продаж · {owner.boxes} кор.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Остаток к выплате</p>
                      <p className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{remaining.toLocaleString()} с.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
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
                  </div>
                  {remaining > 0 && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setPayoutOwner(owner.name); setPayoutOpen(true); }} className="w-full mt-3 text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50">
                      <ArrowDownCircle className="w-3.5 h-3.5" /> Выплатить {remaining.toLocaleString()} с.
                    </Button>
                  )}
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
    </div>
  );
}