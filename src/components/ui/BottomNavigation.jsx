import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function BottomNavigation({ currentPageName, menuItems, lang }) {
  const bottomItems = menuItems.slice(0, 4); // Dashboard, Analytics, Products, Sales

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {bottomItems.map((item) => {
          const isActive = currentPageName === item.name;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.name)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium truncate">{item.labelKey.split('_')[1]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}