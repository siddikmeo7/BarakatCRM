import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendUp,
  className,
  iconBg = "bg-indigo-100",
  iconColor = "text-indigo-600"
}) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-2 sm:p-3 md:p-4 lg:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 truncate">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs sm:text-sm font-medium",
              trendUp ? "text-emerald-600" : "text-red-600"
            )}>
              <span>{trendUp ? '↑' : '↓'}</span>
              <span>{trend}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("p-1.5 sm:p-2 md:p-2.5 lg:p-3 rounded-xl flex-shrink-0", iconBg)}>
            <Icon className={cn("w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6", iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}