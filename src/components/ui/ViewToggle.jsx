import React from 'react';
import { LayoutGrid, List, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ViewToggle({ view, onChange, enableCustomersView = false }) {
  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
      <button
        onClick={() => onChange('grid')}
        className={cn(
          'p-1.5 rounded-md transition-all',
          view === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'
        )}
        title="Сетка"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={cn(
          'p-1.5 rounded-md transition-all',
          view === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'
        )}
        title="Список"
      >
        <List className="w-4 h-4" />
      </button>
      {enableCustomersView && (
        <button
          onClick={() => onChange('customers')}
          className={cn(
            'p-1.5 rounded-md transition-all',
            view === 'customers' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          )}
          title="По клиентам"
        >
          <Users className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}