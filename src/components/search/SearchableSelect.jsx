import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';

export default function SearchableSelect({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = "Поиск..." 
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const selectedValue = value || '';

  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="relative mt-1.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        <Input
          value={open ? search : selectedValue}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
        {selectedValue && !open && (
          <button
            onClick={() => {
              onChange('');
              setSearch('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setOpen(false);
              setSearch('');
            }}
          />
          <div className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
            {filteredOptions.map((option, i) => (
              <div
                key={i}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setSearch('');
                }}
                className={`px-4 py-2 hover:bg-slate-50 cursor-pointer ${
                  value === option ? 'bg-indigo-50 text-indigo-700' : ''
                }`}
              >
                {option}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-3 text-center text-slate-500 text-sm">
                Не найдено
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}