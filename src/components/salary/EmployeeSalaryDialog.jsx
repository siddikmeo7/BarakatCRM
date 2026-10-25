import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import SalaryPaymentHistory from './SalaryPaymentHistory';
import SalaryScheduleEditor from './SalaryScheduleEditor';
import SalaryDueBadge from './SalaryDueBadge';
import { getSalaryMethod } from '@/lib/salary';
import { getSalaryDueState, getSalaryPeriod, formatDueMoment, formatPaidAt, formatPayDay } from '@/lib/salaryPeriod';
import { Wallet, Banknote, Calendar, Settings2, Loader2, AlertTriangle, CheckCircle2, Clock, CalendarOff } from 'lucide-react';

const fmtMoney = (n) => (n || 0).toLocaleString('ru-RU');

export default function EmployeeSalaryDialog({ employee, stat, business, canManage, onClose, onChanged }) {
  const [payments, setPayments] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const period = getSalaryPeriod();

  const isReal = !!employee?.id && !employee._unknown;
  const method = getSalaryMethod(employee?.salary_method || 'per_box');
  const suggested = employee?.salary_method === 'fixed_monthly'
    ? Number(employee?.salary_rate || 0)
    : Number(stat?.salary || 0);

  const load = async () => {
    if (!isReal) { setLoading(false); return; }
    const [pays, scheds] = await Promise.all([
      base44.entities.SalaryPayment.filter({ employee_id: employee.id }).catch(() => []),
      base44.entities.SalarySchedule.filter({ employee_id: employee.id }).catch(() => []),
    ]);
    setPayments([...(pays || [])].sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0)));
    setSchedule((scheds || [])[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    setAmount(suggested > 0 ? String(suggested) : '');
    load();
  }, [employee?.id]);

  const dueState = getSalaryDueState({ employee, schedule, payments, now: new Date() });

  const pay = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) { alert('Введите корректную сумму зарплаты'); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({}));
      const me = window.__barakatEmployee;
      const payerName = me?.name || user.full_name || user.email || '';
      await base44.entities.SalaryPayment.create({
        business_id: business.id,
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.user_email,
        amount: value,
        method: employee.salary_method || 'per_box',
        period_key: period.periodKey,
        period_label: period.monthLabel,
        paid_at: new Date().toISOString(),
        paid_by_name: payerName,
        paid_by_email: user.email || '',
        note: note.trim(),
      });
      await base44.entities.ActivityLog.create({
        business_id: business.id,
        action_type: 'create',
        entity_type: 'SalaryPayment',
        entity_id: employee.id,
        user_email: user.email || '',
        user_name: payerName,
        description: `Выплачена зарплата: ${employee.name} — ${value} с. за ${period.monthLabel}`,
      });
      setNote('');
      await load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const saveSchedule = async (data) => {
    setSavingSchedule(true);
    try {
      if (schedule?.id) {
        await base44.entities.SalarySchedule.update(schedule.id, data);
      } else {
        await base44.entities.SalarySchedule.create({
          business_id: business.id,
          employee_id: employee.id,
          ...data,
        });
      }
      await load();
      setShowSchedule(false);
      onChanged?.();
    } finally {
      setSavingSchedule(false);
    }
  };

  const renderDueCard = () => {
    if (dueState.status === 'due') {
      return (
        <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-bold text-destructive flex items-center gap-1.5 animate-salary-due w-fit px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
            <AlertTriangle className="w-4 h-4" />
            Пора выплатить зарплату
          </p>
          <p className="text-xs text-muted-foreground mt-2">Срок наступил: {formatDueMoment(dueState.dueDate)}</p>
        </div>
      );
    }
    if (dueState.status === 'paid') {
      return (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Зарплата за {period.monthLabel} выплачена
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {fmtMoney(dueState.paid.amount)} с. · {formatPaidAt(dueState.paid.paid_at)}
            {dueState.paid.paid_by_name ? ` · выплатил ${dueState.paid.paid_by_name}` : ''}
          </p>
        </div>
      );
    }
    if (dueState.status === 'upcoming') {
      return (
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Ожидаемая выплата: {formatDueMoment(dueState.dueDate)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Когда наступит этот день и время, здесь появится мигающее уведомление.</p>
        </div>
      );
    }
    if (dueState.status === 'no_schedule') {
      return (
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <CalendarOff className="w-4 h-4 text-muted-foreground" />
            День и время выплаты не заданы
          </p>
          <p className="text-xs text-muted-foreground mt-1">Задайте день и время — и система будет напоминать о выплате мигающим индикатором.</p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground">
          {method.icon} Метод «{method.label}» — зарплата считается от продаж, фиксированного срока выплаты нет.
        </p>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Профиль и зарплата
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Employee */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <EmployeeAvatar employee={employee} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground truncate">{employee?.name || 'Сотрудник'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {method.icon} {method.label} · {fmtMoney(employee?.salary_method === 'per_box' ? employee?.salary_per_box : employee?.salary_rate)}{method.key === 'percent_revenue' ? '%' : ' с.'}
              </p>
            </div>
            <SalaryDueBadge state={dueState} />
          </div>

          {/* Period amount */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
            <p className="text-xs opacity-90">Зарплата за {period.monthLabel}</p>
            <p className="text-2xl font-black mt-1">
              {fmtMoney(dueState.status === 'paid' ? dueState.paid.amount : suggested)} с.
            </p>
            {stat && employee?.salary_method !== 'fixed_monthly' && (
              <p className="text-[11px] opacity-90 mt-1">{stat.boxes} коробок · {stat.salesCount} продаж</p>
            )}
          </div>

          {renderDueCard()}

          {canManage && isReal && (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Выдать зарплату
              </p>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="Сумма (с.)"
                  className="flex-1"
                />
                <Button onClick={pay} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  Выдать
                </Button>
              </div>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Примечание (необязательно)" />
              <p className="text-[11px] text-muted-foreground">Запись сохранится в истории за {period.monthLabel}.</p>
            </div>
          )}

          {/* Schedule */}
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  День и время выплаты
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatPayDay(schedule)}</p>
              </div>
              {canManage && isReal && (
                <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => setShowSchedule(v => !v)}>
                  <Settings2 className="w-3.5 h-3.5" />
                  {schedule ? 'Изменить' : 'Задать'}
                </Button>
              )}
            </div>
            {showSchedule && (
              <div className="mt-3">
                <SalaryScheduleEditor key={schedule?.id || 'new'} schedule={schedule} onSave={saveSchedule} saving={savingSchedule} />
              </div>
            )}
          </div>

          <SalaryPaymentHistory payments={payments} loading={loading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}