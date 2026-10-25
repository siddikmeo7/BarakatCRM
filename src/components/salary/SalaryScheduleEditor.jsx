import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2 } from 'lucide-react';
import { DEFAULT_PAY_TIME } from '@/lib/salaryPeriod';

export default function SalaryScheduleEditor({ schedule, onSave, saving }) {
  const [day, setDay] = useState(schedule?.pay_day ? String(schedule.pay_day) : '');
  const [time, setTime] = useState(schedule?.pay_time || DEFAULT_PAY_TIME);

  const submit = () => {
    const parsedDay = parseInt(day, 10);
    if (!parsedDay || parsedDay < 1 || parsedDay > 31) {
      alert('Укажите день месяца от 1 до 31');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      alert('Укажите время в формате ЧЧ:ММ, например 10:00');
      return;
    }
    onSave({ pay_day: parsedDay, pay_time: time });
  };

  return (
    <div className="space-y-2">
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
          <label className="text-[11px] font-medium text-muted-foreground">Время</label>
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