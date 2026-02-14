import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const presets = [
  { label: 'Сегодня', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Вчера', getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: 'Неделя', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Месяц', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Год', getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export default function DateFilter({ dateRange, onDateRangeChange }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetClick = (preset) => {
    onDateRangeChange(preset.getValue());
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return 'Выберите период';
    if (!dateRange.to) return format(dateRange.from, 'dd MMM yyyy', { locale: ru });
    return `${format(dateRange.from, 'dd MMM', { locale: ru })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ru })}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant="outline"
          size="sm"
          onClick={() => handlePresetClick(preset)}
          className={cn(
            "text-xs",
            dateRange?.from && 
            format(dateRange.from, 'yyyy-MM-dd') === format(preset.getValue().from, 'yyyy-MM-dd') &&
            "bg-indigo-50 border-indigo-200 text-indigo-700"
          )}
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              onDateRangeChange(range);
              if (range?.from && range?.to) setIsOpen(false);
            }}
            numberOfMonths={2}
            locale={ru}
          />
        </PopoverContent>
      </Popover>

      {dateRange?.from && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateRangeChange(null)}
          className="text-slate-500 hover:text-slate-700"
        >
          Сбросить
        </Button>
      )}
    </div>
  );
}