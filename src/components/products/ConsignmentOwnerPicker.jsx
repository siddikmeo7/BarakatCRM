import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Search, X, UserPlus, Check, Mail, User } from 'lucide-react';

/**
 * Выбор владельца товара на реализации.
 * Показывает список всех существующих владельцев (из товаров на реализации),
 * с поиском по имени и кнопкой «Добавить нового владельца».
 * Это исключает опечатки и дубли имен у разных сотрудников.
 *
 * Props:
 *  - businessId
 *  - ownerName, ownerEmail — текущие значения
 *  - onChange(name, email) — вызывается при выборе существующего или сохранении нового
 */
export default function ConsignmentOwnerPicker({ businessId, ownerName, ownerEmail, onChange }) {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const wrapRef = useRef(null);

  // Загружаем уникальных владельцев из товаров на реализации
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const items = await base44.entities.ConsignmentProduct.filter({ business_id: businessId });
        if (cancelled) return;
        const map = new Map();
        items.forEach(p => {
          const name = (p.owner_name || '').trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (!map.has(key)) {
            map.set(key, { name, email: p.owner_email || '' });
          } else {
            // дополняем email если его не было
            const existing = map.get(key);
            if (!existing.email && p.owner_email) map.set(key, { ...existing, email: p.owner_email });
          }
        });
        setOwners([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (_) {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  // Закрытие по клику вне
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setAddingNew(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(o => o.name.toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q));
  }, [owners, search]);

  const handleSelect = (owner) => {
    onChange(owner.name, owner.email || '');
    setOpen(false);
    setSearch('');
    setAddingNew(false);
  };

  const handleAddNew = () => {
    const name = newName.trim();
    if (!name) return;
    // Проверим, нет ли уже такого (case-insensitive)
    const exists = owners.find(o => o.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      // Просто выбираем существующего
      onChange(exists.name, exists.email || newEmail.trim());
    } else {
      onChange(name, newEmail.trim());
      // Добавляем в локальный список, чтобы сразу появился
      setOwners(prev => [...prev, { name, email: newEmail.trim() }].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setNewName('');
    setNewEmail('');
    setAddingNew(false);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={wrapRef}>
      {/* Кнопка-триггер со стрелкой вниз */}
      <div className="flex gap-1.5 mt-1.5">
        <div
          onClick={() => { setOpen(v => !v); setAddingNew(false); }}
          className={`flex-1 flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors bg-white dark:bg-slate-800 ${open ? 'border-teal-400 ring-1 ring-teal-200' : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'}`}
        >
          <User className="w-4 h-4 text-teal-500 flex-shrink-0" />
          {ownerName ? (
            <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{ownerName}</span>
          ) : (
            <span className="flex-1 text-sm text-slate-400">Выберите владельца...</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setOpen(v => !v); setAddingNew(false); }}
          className="flex items-center justify-center px-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 hover:border-teal-300 text-slate-500 hover:text-teal-600 transition-colors flex-shrink-0"
          title="Показать список владельцев"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Выпадающий список */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {!addingNew ? (
            <>
              {/* Поиск */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск по имени владельца..."
                    className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Список владельцев */}
              <div className="max-h-56 overflow-y-auto custom-scroll">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-6">Загрузка...</p>
                ) : filtered.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-xs text-slate-400 mb-2">{search ? 'Нет совпадений' : 'Пока нет владельцев'}</p>
                    <button
                      onClick={() => { setAddingNew(true); setNewName(search); }}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      + Добавить нового владельца
                    </button>
                  </div>
                ) : (
                  filtered.map(owner => {
                    const isSelected = owner.name === ownerName;
                    return (
                      <button
                        key={owner.name}
                        type="button"
                        onClick={() => handleSelect(owner)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${isSelected ? 'bg-teal-50 dark:bg-teal-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                          {isSelected ? <Check className="w-4 h-4 text-white" /> : <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{owner.name.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isSelected ? 'text-teal-700 dark:text-teal-300 font-semibold' : 'text-slate-800 dark:text-slate-200'}`}>{owner.name}</p>
                          {owner.email && (
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {owner.email}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Кнопка добавления нового владельца */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setAddingNew(true); setNewName(search); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Добавить нового владельца
                </button>
              </div>
            </>
          ) : (
            // Форма добавления нового владельца
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <UserPlus className="w-4 h-4 text-teal-600" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Новый владелец</p>
              </div>
              <div>
                <Label className="text-xs">Имя владельца *</Label>
                <Input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Имя и фамилия"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email владельца</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@example.com (необязательно)"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAddingNew(false); setNewName(''); setNewEmail(''); }}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={!newName.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Отображение email выбранного владельца (только для чтения, если выбран из списка) */}
      {ownerEmail && !addingNew && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
          <Mail className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
          <span className="text-xs text-teal-700 dark:text-teal-300 truncate">{ownerEmail}</span>
        </div>
      )}
    </div>
  );
}