import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2, CalendarClock, X } from 'lucide-react';
import { addDays } from 'date-fns';
import { DEFAULT_PAY_TIME, getPayDay, getPayTime, getNextPayDate, shiftPayDate } from '@/lib/salaryPeriod';

// Значение для <input type="datetime-local">
const toLocalInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const QUICK = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: '+1 день' },
  { key: 'week', label: '+7 дней' },
  { key: 'nextMonth', label: '+1 месяц' },
  { key: 'monthFirst', label: '1-е число' },
];

export default function SalaryScheduleEditor({ schedule, onSave, saving }) {
  const [day, setDay] = useState(getPayDay(schedule) ? String(getPayDay(schedule)) : '');
  const [time, setTime] = useState(getPayTime(schedule));
  const [next, setNext] = useState(toLocalInput(getNextPayDate(schedule)));

  const applyQuick = (key) => {
    const [hh, mm] = getPayTime({ pay_time: time }).split(':').map(Number);
    let d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    if (key === 'tomorrow') d = addDays(d, 1);
    if (key === 'week') d = addDays(d, 7);
    if (key === 'nextMonth') d = shiftPayDate(d, 1);
    if (key === 'monthFirst') { d = shiftPayDate(d, 1); d.setDate(1); }
    setNext(toLocalInput(d));
  };

  const submit = () => {
    const parsedDay = parseInt(day, 10);
    const hasDay = parsedDay >= 1 && parsedDay <= 31;
    if (!hasDay && !next) {
      alert('Укажите день месяца или точную дату следующей выплаты');
      return;
    }
    if (day && !hasDay) {
      alert('Укажите день месяца от 1 до 31');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      alert('Укажите время в формате ЧЧ:ММ, например 10:00');
      return;
    }
    onSave({
      pay_day: hasDay ? parsedDay : getPayDay(schedule) || 1,
      pay_time: time,
      next_pay_date: next ? new Date(next).toISOString() : '',
    });
  };

  return (
    <div className="space-y-3">
      {/* Точная дата следующей выплаты */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5" />
          Следующая выплата — точная дата и время
        </p>
        <div className="flex gap-2 items-center">
          <Input type="datetime-local" value={next} onChange={e => setNext(e.target.value)} className="flex-1" />
          {next && (
            <button type="button" onClick={() => setNext('')} title="Убрать точную дату"
              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map(q => (
            <button key={q.key} type="button" onClick={() => applyQuick(q.key)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium border border-indigo-200 dark:border-indigo-700 bg-card text-indigo-700 dark:text-indigo-300 hover:border-indigo-400 transition-colors">
              {q.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Если дата задана — она перекрывает день месяца. После выдачи зарплаты дата автоматически переносится на месяц вперёд.
        </p>
      </div>

      {/* Повторяющийся день месяца */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-muted-foreground">День месяца (1-31)</label>
          <Input
            inputMode="numeric"
            value={day}
            onChange={e => setDay(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="5"
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-medium text-muted-foreground">Время ({DEFAULT_PAY_TIME} по умолчанию)</label>
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1" />
        </div>
      </div>

      <Button onClick={submit} disabled={saving} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Сохранить график выплаты
      </Button>
    </div>
  );
}