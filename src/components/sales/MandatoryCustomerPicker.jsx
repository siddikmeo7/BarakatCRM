import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, UserCheck, Phone, X } from 'lucide-react';

/**
 * Обязательный выбор клиента при продаже.
 * - Имя + телефон обязательны.
 * - Можно найти существующего клиента (по имени/телефону) и выбрать его.
 * - Если клиент не найден — подсказка «ещё не сохранён», будет создан автоматически при продаже.
 * Props:
 *  - customers: список клиентов бизнеса
 *  - value: { customer_id, name, phone }
 *  - onChange({ customer_id, name, phone })
 */
export default function MandatoryCustomerPicker({ customers, value, onChange }) {
  const [search, setSearch] = useState('');

  const resolved = value.customer_id
    ? customers.find(c => c.id === value.customer_id)
    : null;

  const matches = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return customers
      .filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      )
      .slice(0, 6);
  }, [search, customers]);

  const selectExisting = (c) => {
    onChange({ customer_id: c.id, name: c.name, phone: c.phone || '' });
    setSearch('');
  };

  const clearSelection = () => {
    onChange({ customer_id: '', name: '', phone: '' });
    setSearch('');
  };

  // Выбран существующий клиент
  if (resolved) {
    return (
      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{resolved.name}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
            <Phone className="w-3 h-3" /> {resolved.phone || '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="text-slate-400 hover:text-red-500 p-1 flex-shrink-0"
          title="Сменить клиента"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const nameFilled = (value.name || '').trim();
  const phoneFilled = (value.phone || '').trim();

  return (
    <div className="space-y-3">
      <div>
        <Label>Имя и фамилия клиента <span className="text-red-500">*</span></Label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, customer_id: '', name: e.target.value })}
          placeholder="Введите имя и фамилию"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Телефон клиента <span className="text-red-500">*</span></Label>
        <Input
          value={value.phone}
          onChange={(e) => onChange({ ...value, customer_id: '', phone: e.target.value })}
          placeholder="+992 XXX XX XX XX"
          className="mt-1.5"
          inputMode="tel"
        />
      </div>

      {/* Поиск среди существующих клиентов */}
      {nameFilled && (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Или найдите уже сохранённого клиента..."
              className="pl-10"
            />
          </div>
          {search && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
              {matches.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectExisting(c)}
                  className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                      {c.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                  <UserCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
              {matches.length === 0 && (
                <div className="p-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                    Клиент не найден — будет сохранён автоматически при продаже
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Подсказка о новом клиенте */}
      {nameFilled && !search && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <UserPlus className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {phoneFilled
              ? 'Новый клиент — будет автоматически сохранён в разделе «Клиенты» при продаже.'
              : 'Введите телефон, чтобы сохранить нового клиента.'}
          </p>
        </div>
      )}
    </div>
  );
}