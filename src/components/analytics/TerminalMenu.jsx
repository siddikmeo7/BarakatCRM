import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Одна кнопка с выпадающим списком в стиле «терминала»: валюта, тип графика и т.п.
// Список закрывается по клику вне меню и по Esc.
export default function TerminalMenu({ label, value, items, onSelect, footer, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = items.find(i => i.value === value);

  return (
    <div className={cn('tk-dd', className)} ref={ref}>
      <button
        type="button"
        className={cn('tk-btn', open && 'on')}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {selected ? `${label}: ${selected.label}` : label}
        <ChevronDown className={cn('tk-dd-caret', open && 'up')} />
      </button>

      {open && (
        <div className="tk-dd-pop" role="menu">
          {items.map(item => (
            <button
              key={item.value}
              type="button"
              role="menuitem"
              className={cn('tk-dd-item', item.value === value && 'on')}
              onClick={() => {
                onSelect(item.value);
                setOpen(false);
              }}
            >
              <span>{item.label}</span>
              {item.value === value && <Check className="w-3 h-3" />}
            </button>
          ))}
          {footer && <div className="tk-dd-foot">{footer}</div>}
        </div>
      )}
    </div>
  );
}