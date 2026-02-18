import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
      <button
        onClick={() => onChange('grid')}
        className={cn(
          'p-1.5 rounded-md transition-all',
          view === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={cn(
          'p-1.5 rounded-md transition-all',
          view === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'
        )}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}