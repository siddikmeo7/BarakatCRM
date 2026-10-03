import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X as XIcon } from 'lucide-react';

const DATE_TABS = [
  { key: 'all', label: 'Все' },
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'custom', label: '📅 Период' },
];

// Общая панель фильтров товаров склада: дата добавления, сотрудник, тип, цена.
// Используется и в главном виде раздела «Склады», и внутри конкретного склада.
export default function WarehouseProductFilters({
  dateFilter, setDateFilter, customDateFrom, setCustomDateFrom, customDateTo, setCustomDateTo,
  employeeFilter, setEmployeeFilter, creators = [],
  typeFilter, setTypeFilter, productTypes = [],
  priceMin, setPriceMin, priceMax, setPriceMax,
}) {
  const hasActive =
    dateFilter !== 'all' || employeeFilter !== 'all' || typeFilter !== 'all' || !!priceMin || !!priceMax;

  const resetAll = () => {
    setDateFilter('all'); setCustomDateFrom(''); setCustomDateTo('');
    setEmployeeFilter('all'); setTypeFilter('all'); setPriceMin(''); setPriceMax('');
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500 mr-1">Дата:</span>
        {DATE_TABS.map(f => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${dateFilter === f.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}
          >
            {f.label}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} className="h-7 text-xs w-36" />
            <span className="text-xs text-slate-400">—</span>
            <Input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} className="h-7 text-xs w-36" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Сотрудник" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все сотрудники</SelectItem>
            {creators.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Тип товара" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {productTypes.map(tp => (
              <SelectItem key={tp} value={tp}>{tp}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Цена:</span>
          <Input type="number" min="0" placeholder="от" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="h-8 w-20 text-xs" />
          <span className="text-xs text-slate-400">—</span>
          <Input type="number" min="0" placeholder="до" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="h-8 w-20 text-xs" />
        </div>

        {hasActive && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium"
          >
            <XIcon className="w-3 h-3" /> Сбросить
          </button>
        )}
      </div>
    </div>
  );
}