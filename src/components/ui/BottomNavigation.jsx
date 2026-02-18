import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function BottomNavigation({ currentPageName, menuItems, lang }) {
  const navigate = useNavigate();

  const handleNavClick = (itemName, currentName) => {
    if (itemName === currentName) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(createPageUrl(itemName));
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 z-40 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-1">
        {menuItems.map((item) => {
          const isActive = currentPageName === item.name;
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.name, currentPageName)}
              className={cn(
                "flex items-center justify-center flex-1 py-2.5 transition-colors user-select-none",
                isActive
                  ? "text-indigo-600"
                  : "text-slate-500 dark:text-slate-400"
              )}
              title={item.labelKey}
            >
              <item.icon className="w-6 h-6" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}