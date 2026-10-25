import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreditCard, Loader2, Save, Check } from 'lucide-react';
import { TRIAL_DAYS } from '@/lib/subscription';

const CAP = 'text-[10.5px] font-bold uppercase tracking-[.12em] text-slate-500 dark:text-slate-400';
const FIELD = 'h-9 rounded-[11px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';

const EMPTY = {
  name: 'BarakatCRM — подписка',
  title: 'BarakatCRM — доступ на 1 месяц',
  description: 'Доступ к системе для одного бизнеса, списание каждый месяц',
  price: '100',
  currency: 'TJS',
  trial_days: TRIAL_DAYS,
  is_active: true,
};

// Настройки тарифа: цену и валюту задаёт владелец системы
export default function PlanEditorCard() {
  const [planId, setPlanId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.SubscriptionPlan.list();
        const list = Array.isArray(res) ? res : (res?.items ?? []);
        const plan = list[0];
        if (plan) {
          setPlanId(plan.id);
          setForm({
            name: plan.name || EMPTY.name,
            title: plan.title || EMPTY.title,
            description: plan.description || EMPTY.description,
            price: String(plan.price ?? EMPTY.price),
            currency: plan.currency || EMPTY.currency,
            trial_days: plan.trial_days ?? TRIAL_DAYS,
            is_active: plan.is_active !== false,
          });
        }
      } catch (_) {
        // тариф ещё не создан — остаются значения по умолчанию
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = { ...form, price: String(form.price), trial_days: Number(form.trial_days) || TRIAL_DAYS };
      if (planId) {
        await base44.entities.SubscriptionPlan.update(planId, payload);
      } else {
        const created = await base44.entities.SubscriptionPlan.create(payload);
        setPlanId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-[18px] h-[18px] text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Тариф подписки</h3>
        <span className={CAP}>оплата через Base44 Payments</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Загрузка тарифа...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={CAP}>Цена за месяц</label>
              <Input
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className={`${FIELD} mt-1`}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={CAP}>Валюта</label>
              <Input
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                className={`${FIELD} mt-1`}
              />
            </div>
            <div>
              <label className={CAP}>Бесплатных дней</label>
              <Input
                value={form.trial_days}
                onChange={e => setForm(f => ({ ...f, trial_days: e.target.value }))}
                className={`${FIELD} mt-1`}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={CAP}>Название тарифа</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${FIELD} mt-1`} />
            </div>
            <div>
              <label className={CAP}>Заголовок на странице оплаты</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={`${FIELD} mt-1`} />
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Укажите цену в валюте вашего платёжного аккаунта. Минимальная сумма списания — 0.50.
          </p>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving || !form.price} className="rounded-full bg-indigo-600 hover:bg-indigo-700 font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Сохранено' : 'Сохранить тариф'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}