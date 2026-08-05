import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, UserCheck, Phone, X, AlertTriangle, Users } from 'lucide-react';

// Нормализация телефона — только цифры (для сравнения на дубликаты)
export const normalizePhone = (p = '') => String(p).replace(/\D/g, '');

/**
 * Обязательный выбор клиента при продаже.
 * - Имя + телефон обязательны.
 * - Кнопка «Выбрать существующего клиента» видна сразу — открывает список/поиск.
 * - Авто-проверка дубликатов: при вводе имени+телефона система ищет совпадение
 *   в базе. Если найден — показывает предупреждение и предлагает выбрать его.
 * - Не создаёт дублей: при сохранении родитель тоже проверяет по телефону.
 * Props:
 *  - customers: список клиентов бизнеса
 *  - value: { customer_id, name, phone }
 *  - onChange({ customer_id, name, phone })
 */
export default function MandatoryCustomerPicker({ customers, value, onChange }) {
  const [search, setSearch] = useState('');
  const [showExisting, setShowExisting] = useState(false);

  const resolved = value.customer_id
    ? customers.find(c => c.id === value.customer_id)
    : null;

  const matches = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? customers.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q)
        )
      : customers;
    return list.slice(0, 8);
  }, [search, customers]);

  const selectExisting = (c) => {
    onChange({ customer_id: c.id, name: c.name, phone: c.phone || '' });
    setSearch('');
    setShowExisting(false);
  };

  const clearSelection = () => {
    onChange({ customer_id: '', name: '', phone: '' });
    setSearch('');
  };

  // Проверка на дубликат при вводе нового клиента (по нормализованному телефону)
  const duplicateByPhone = useMemo(() => {
    const phone = normalizePhone(value.phone);
    if (phone.length < 7) return null; // слишком короткий — игнорируем
    return customers.find(c => normalizePhone(c.phone) === phone) || null;
  }, [value.phone, customers]);

  const duplicateByName = useMemo(() => {
    const name = (value.name || '').trim().toLowerCase();
    if (name.length < 3) return null;
    return customers.find(c =>
      (c.name || '').trim().toLowerCase() === name &&
      !duplicateByPhone // не дублируем предупреждение
    ) || null;
  }, [value.name, customers, duplicateByPhone]);

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
  const hasDuplicate = !!(duplicateByPhone || duplicateByName);

  return (
    <div className="space-y-3">
      {/* Кнопка выбора существующего клиента — видна сразу */}
      {!showExisting && (
        <button
          type="button"
          onClick={() => setShowExisting(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
        >
          <Users className="w-4 h-4" />
          Выбрать уже существующего клиента
        </button>
      )}

      {/* Список / поиск существующих клиентов */}
      {showExisting && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени или телефону..."
              className="pl-10"
            />
          </div>
          <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 custom-scroll">
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
                  Не найдено — заполните поля ниже, клиент сохранится при продаже
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setShowExisting(false); setSearch(''); }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Скрыть список
          </button>
        </div>
      )}

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

      {/* Предупреждение о дубликате */}
      {hasDuplicate && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Такой клиент уже существует в базе
            </p>
            {duplicateByPhone && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {duplicateByPhone.name} · {duplicateByPhone.phone}
              </p>
            )}
            {duplicateByName && !duplicateByPhone && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {duplicateByName.name} · {duplicateByName.phone || '—'}
              </p>
            )}
            <button
              type="button"
              onClick={() => selectExisting(duplicateByPhone || duplicateByName)}
              className="mt-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
            >
              Выбрать этого клиента →
            </button>
          </div>
        </div>
      )}

      {/* Подсказка о новом клиенте */}
      {nameFilled && !hasDuplicate && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/60">
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