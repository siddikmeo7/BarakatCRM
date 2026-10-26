import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Заголовок раздела в стиле «тёмный терминал»: крупный заголовок,
 * подпись капсом и тонкая линия снизу — одинаково во всех разделах.
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  actions,
  className 
}) {
  return (
    <div className={cn("tk-pagehead", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="tk-pagehead-title truncate">{title}</h1>
          {subtitle && (
            <p className="tk-pagehead-sub truncate">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}