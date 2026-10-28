import React, { useState } from 'react';
import { History, Pencil, Check, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPaidAt } from '@/lib/salaryPeriod';
import { getSalaryMethod } from '@/lib/salary';

const fmtMoney = (n) => (n || 0).toLocaleString('ru-RU');

// История выплат сотрудника. Владелец может исправить сумму и примечание выплаты,
// если при выдаче зарплаты было введено неверное число.
export default function SalaryPaymentHistory({ payments = [], loading, canEdit, onChanged }) {
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (p) => {
    setEditingId(p.id);
    setAmount(String(p.amount ?? ''));
    setNote(p.note || '');
  };

  const cancelEdit = () => { setEditingId(null); setSaving(false); };

  const save = async (p) => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) { alert('Введите корректную сумму зарплаты'); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({}));
      await base44.entities.SalaryPayment.update(p.id, {
        amount: value,
        note: note.trim(),
        corrections: [
          ...(p.corrections || []),
          {
            corrected_at: new Date().toISOString(),
            by_email: user?.email || '',
            by_name: user?.full_name || '',
            old_amount: p.amount ?? 0,
            new_amount: value,
          },
        ],
      });
      const me = window.__barakatEmployee;
      await base44.entities.ActivityLog.create({
        business_id: p.business_id,
        action_type: 'update',
        entity_type: 'SalaryPayment',
        entity_id: p.employee_id,
        user_email: user?.email || '',
        user_name: me?.name || user?.full_name || '',
        description: `Исправлена сумма зарплаты: ${p.employee_name || ''} — ${p.amount} → ${value} с. за ${p.period_label || p.period_key}`,
      }).catch(() => {});
      setEditingId(null);
      window.dispatchEvent(new Event('salaryPaymentsChanged'));
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-emerald-600" />
        <p className="text-sm font-semibold text-foreground">История выплат</p>
        <span className="ml-auto text-xs text-muted-foreground">{payments.length}</span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Загрузка...</p>
      ) : payments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Выплат ещё не было</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll pr-1">
          {payments.map(p => (
            <div key={p.id} className="rounded-xl border border-border bg-muted/40 p-2.5">
              {editingId === p.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="h-8 w-28 rounded-lg border border-border bg-background px-2 text-sm font-bold text-emerald-600"
                      placeholder="Сумма"
                      autoFocus
                    />
                    <span className="text-[11px] text-muted-foreground">с.</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:bg-muted"
                        title="Отмена"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => save(p)}
                        disabled={saving}
                        className="h-8 px-2 rounded-lg bg-emerald-600 text-white flex items-center gap-1 text-[11px] font-bold hover:bg-emerald-700"
                        title="Сохранить"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Сохранить
                      </button>
                    </div>
                  </div>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Примечание"
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Выплата за {p.period_label || p.period_key} · сотрудник увидит исправленный чек
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-600">{fmtMoney(p.amount)} с.</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">{formatPaidAt(p.paid_at)}</span>
                      {canEdit && (
                        <button
                          onClick={() => startEdit(p)}
                          className="h-6 w-6 rounded-md border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-indigo-600 hover:border-indigo-400"
                          title="Изменить сумму"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    <span>{getSalaryMethod(p.method).icon} {getSalaryMethod(p.method).label}</span>
                    {p.period_label && (
                      <span className="text-foreground font-semibold">
                        · Зарплата за {p.method === 'fixed_monthly' ? `месяц ${p.period_label}` : p.period_label}
                      </span>
                    )}
                  </div>
                  {p.note && <p className="text-[11px] text-muted-foreground mt-1">{p.note}</p>}
                  {p.paid_by_name && <p className="text-[11px] text-muted-foreground mt-1">Выплатил: {p.paid_by_name}</p>}
                  {(p.corrections?.length || 0) > 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Сумма исправлена {(p.corrections.length === 1 ? '' : `${p.corrections.length} раза`)}: была {fmtMoney(p.corrections[0].old_amount)} с.
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}