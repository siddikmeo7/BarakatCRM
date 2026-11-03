import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Plus, X } from 'lucide-react';

// Выбор сотрудника, от имени которого фиксируется расход.
// В списке — сотрудники бизнеса и ранее указанные лица; если человека ещё нет,
// его можно добавить прямо здесь и сразу выбрать.
export default function SpentByPicker({ value, onChange, employees = [], usedNames = [], className }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [extras, setExtras] = useState([]);

  const teamNames = employees.filter(e => !e.deleted_at).map(e => e.name).filter(Boolean);
  const options = [...new Set([...teamNames, ...usedNames, ...extras].filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const confirmNew = () => {
    const name = draft.trim();
    if (!name) return;
    setExtras(prev => (prev.includes(name) ? prev : [...prev, name]));
    onChange(name);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="mt-1.5 space-y-2">
      <Select
        value={value || '__none__'}
        onValueChange={(v) => {
          if (v === '__new__') { setAdding(true); return; }
          onChange(v === '__none__' ? '' : v);
        }}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder="Не указано" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Не указано</SelectItem>
          {options.map(name => (
            <SelectItem key={name} value={name}>{name}</SelectItem>
          ))}
          <SelectItem value="__new__" className="font-semibold text-indigo-600">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Добавить нового сотрудника
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {adding && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Имя сотрудника"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNew(); } }}
            className={className}
          />
          <Button
            type="button"
            onClick={confirmNew}
            disabled={!draft.trim()}
            className="h-9 rounded-[11px] px-3 bg-indigo-600 text-white font-bold"
            title="Добавить и выбрать"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setAdding(false); setDraft(''); }}
            className="h-9 rounded-[11px] px-2.5 border-slate-300"
            title="Отмена"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}