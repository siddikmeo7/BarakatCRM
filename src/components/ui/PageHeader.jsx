import React from 'react';
import { cn } from '@/lib/utils';

export default function PageHeader({ 
  title, 
  subtitle, 
  actions,
  className 
}) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 mt-0.5 text-xs sm:text-sm truncate">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}