import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const presets = [
  { label: 'Сегодня',  key: 'today',   getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Вчера',    key: 'yesterday',getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: '7 дней',   key: '7d',       getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: '30 дней',  key: '30d',      getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: 'Неделя',   key: 'week',     getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Месяц',    key: 'month',    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Год',      key: 'year',     getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

function getActivePreset(range) {
  if (!range?.from || !range?.to) return null;
  for (const p of presets) {
    const v = p.getValue();
    if (isSameDay(range.from, v.from) && isSameDay(range.to, v.to)) return p.key;
  }
  return null;
}

export default function DateFilter({ value, onChange, dateRange, onDateRangeChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const range = value || dateRange;
  const handleChange = onChange || onDateRangeChange;
  const activePreset = getActivePreset(range);

  const formatDateRange = () => {
    if (!range?.from) return 'Период';
    if (!range.to || isSameDay(range.from, range.to)) return format(range.from, 'dd MMM yyyy', { locale: ru });
    return `${format(range.from, 'dd MMM', { locale: ru })} — ${format(range.to, 'dd MMM yyyy', { locale: ru })}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map((preset) => (
        <Button
          key={preset.key}
          variant="outline"
          size="sm"
          onClick={() => handleChange?.(preset.getValue())}
          className={cn(
            "text-xs h-7 px-2.5 rounded-lg font-medium transition-all",
            activePreset === preset.key
              ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              : "hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
          )}
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 h-7 px-2.5 text-xs rounded-lg",
              !activePreset && range?.from ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700" : ""
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {!activePreset && range?.from ? formatDateRange() : 'Свой'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={(newRange) => {
              handleChange?.(newRange);
              if (newRange?.from && newRange?.to) setIsOpen(false);
            }}
            numberOfMonths={2}
            locale={ru}
          />
        </PopoverContent>
      </Popover>

      {range?.from && (
        <button
          onClick={() => handleChange?.(null)}
          className="flex items-center gap-1 h-7 px-2 text-xs text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Сброс
        </button>
      )}
    </div>
  );
}