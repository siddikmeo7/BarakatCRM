import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SALARY_METHODS, getSalaryMethod } from '@/lib/salary';
import { Loader2, Save, Pencil, X } from 'lucide-react';

const fmtMoney = (n) => (Number(n) || 0).toLocaleString('ru-RU');

// Ставка зарплаты сотрудника прямо в его профиле: владелец может исправить
// сумму или способ расчёта, если при настройке было указано неверное число.
export default function SalaryRateEditor({ employee, canManage, onSaved }) {
  const currentMethod = employee?.salary_method || 'per_box';
  const currentInfo = getSalaryMethod(currentMethod);
  const currentRate = currentMethod === 'per_box'
    ? Number(employee?.salary_per_box || 0)
    : Number(employee?.salary_rate || 0);

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(currentMethod);
  const [rate, setRate] = useState(String(currentRate || ''));
  const [saving, setSaving] = useState(false);
  const methodInfo = getSalaryMethod(method);

  const startEdit = () => {
    setMethod(currentMethod);
    setRate(String(currentRate || ''));
    setOpen(true);
  };

  const save = async () => {
    const val = parseFloat(rate);
    if (isNaN(val) || val < 0) { alert('Введите корректную сумму зарплаты (число ≥ 0)'); return; }
    setSaving(true);
    try {
      const update = {
        salary_method: method,
        salary_rate: method === 'per_box' ? 0 : val,
        salary_per_box: method === 'per_box' ? val : 0,
      };
      await base44.entities.Employee.update(employee.id, update);
      setOpen(false);
      await onSaved?.(update);
    } catch (e) {
      console.error('Error saving salary rate:', e);
      alert('Не удалось сохранить сумму зарплаты. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Сумма зарплаты</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentInfo.icon} {currentInfo.label} · <span className="font-bold text-foreground">{fmtMoney(currentRate)}{currentMethod === 'percent_revenue' ? '%' : ' с.'}</span>
          </p>
        </div>
        {canManage && !open && (
          <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={startEdit}>
            <Pencil className="w-3.5 h-3.5" />
            Изменить
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {SALARY_METHODS.map(m => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`rounded-xl border px-2 py-2 text-left text-[11px] font-semibold transition ${
                  method === m.key
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : 'border-border bg-background text-muted-foreground hover:border-indigo-300'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">{methodInfo.rateLabel}</p>
            <Input
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder={methodInfo.ratePlaceholder}
              className="h-9 font-bold"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Сохранить
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving} className="gap-1.5">
              <X className="w-3.5 h-3.5" />
              Отмена
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Новая сумма применяется к расчёту зарплаты с текущего периода.</p>
        </div>
      )}
    </div>
  );
}