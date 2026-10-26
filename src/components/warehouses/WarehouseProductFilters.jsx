import React from 'react';
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
    <div className="flex flex-wrap items-center gap-2">
      {DATE_TABS.map(f => (
        <button
          key={f.key}
          onClick={() => setDateFilter(f.key)}
          className={`wh-chip ${dateFilter === f.key ? 'on' : ''}`}
        >
          {f.label}
        </button>
      ))}

      {dateFilter === 'custom' && (
        <span className="flex items-center gap-1.5">
          <input
            type="date"
            value={customDateFrom}
            onChange={e => setCustomDateFrom(e.target.value)}
            className="wh-fld"
          />
          <span className="text-slate-400 text-[11px]">—</span>
          <input
            type="date"
            value={customDateTo}
            onChange={e => setCustomDateTo(e.target.value)}
            className="wh-fld"
          />
        </span>
      )}

      <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
        <SelectTrigger className="wh-fld h-auto w-[150px]">
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
        <SelectTrigger className="wh-fld h-auto w-[130px]">
          <SelectValue placeholder="Тип товара" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          {productTypes.map(tp => (
            <SelectItem key={tp} value={tp}>{tp}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-500">Цена:</span>
        <input
          type="number"
          min="0"
          placeholder="от"
          value={priceMin}
          onChange={e => setPriceMin(e.target.value)}
          className="wh-fld w-[70px]"
        />
        <span className="text-[11px] text-slate-400">—</span>
        <input
          type="number"
          min="0"
          placeholder="до"
          value={priceMax}
          onChange={e => setPriceMax(e.target.value)}
          className="wh-fld w-[70px]"
        />
      </span>

      {hasActive && (
        <button onClick={resetAll} className="wh-chip">
          <span className="flex items-center gap-1">
            <XIcon className="w-3 h-3" /> Сбросить
          </span>
        </button>
      )}
    </div>
  );
}