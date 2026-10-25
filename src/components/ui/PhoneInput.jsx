import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Коды стран для ввода номера: Таджикистан (по умолчанию), Россия, Китай, Узбекистан
export const COUNTRIES = [
  { code: '992', name: 'Таджикистан', flag: '🇹🇯' },
  { code: '7', name: 'Россия', flag: '🇷🇺' },
  { code: '86', name: 'Китай', flag: '🇨🇳' },
  { code: '998', name: 'Узбекистан', flag: '🇺🇿' },
];

const DEFAULT_CODE = '992';

// Разбирает сохранённый номер на код страны и местную часть.
// Старые номера без кода остаются как есть и получают код по умолчанию.
export function splitPhone(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  const match = COUNTRIES.find(c => digits.startsWith(c.code));
  if (match) return { code: match.code, local: digits.slice(match.code.length) };
  return { code: DEFAULT_CODE, local: digits };
}

export default function PhoneInput({ value, onChange, placeholder, className, onBlur }) {
  const { code, local } = splitPhone(value);

  const update = (nextCode, nextLocal) => {
    const digits = String(nextLocal || '').replace(/[^0-9]/g, '');
    onChange(digits ? `+${nextCode}${digits}` : '');
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={code} onValueChange={(c) => update(c, local)}>
        <SelectTrigger className="w-[132px] flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} +{c.code} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={local}
        inputMode="numeric"
        placeholder={placeholder || '90 123 45 67'}
        onChange={(e) => update(code, e.target.value)}
        onBlur={onBlur}
        className="flex-1"
      />
    </div>
  );
}