import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function BottomNavigation({ currentPageName, menuItems, lang }) {
  const navigate = useNavigate();
  const bottomItems = menuItems.slice(0, 4);

  const handleNavClick = (itemName, currentName) => {
    if (itemName === currentName) {
      // Same tab tapped - scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Different tab - navigate
      navigate(createPageUrl(itemName));
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {bottomItems.map((item) => {
          const isActive = currentPageName === item.name;
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.name, currentPageName)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors user-select-none",
                isActive
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium truncate">{item.labelKey.split('_')[1]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}