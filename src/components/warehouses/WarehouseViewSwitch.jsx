import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

// Переключатель представления товаров: список или сетка
export default function WarehouseViewSwitch({ view, onChange }) {
  return (
    <div className="sh-view">
      <button
        type="button"
        className={view === 'grid' ? 'on' : ''}
        onClick={() => onChange('grid')}
        title="Показать сеткой"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Сетка
      </button>
      <button
        type="button"
        className={view === 'list' ? 'on' : ''}
        onClick={() => onChange('list')}
        title="Показать списком"
      >
        <List className="w-3.5 h-3.5" />
        Список
      </button>
    </div>
  );
}