import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, LogOut } from 'lucide-react';

// Действия с аккаунтом для раздела «Настройки».
// Личные данные и правка профиля живут в разделе «Профиль».
export default function AccountActionsCard({ onSwitchAccount, onLogout }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      <p className="font-semibold text-slate-900 dark:text-white">Аккаунт</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="gap-1.5 text-indigo-600 hover:bg-indigo-50 border-indigo-200" onClick={onSwitchAccount}>
          <ArrowLeftRight className="w-4 h-4" />
          Сменить аккаунт
        </Button>
        <Button variant="outline" className="gap-1.5 text-red-600 hover:bg-red-50 border-red-200" onClick={onLogout}>
          <LogOut className="w-4 h-4" />
          Выйти
        </Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Имя, телефон, фото и стикер профиля меняются в разделе «Профиль» — карточка с вашим именем внизу меню.
      </p>
    </div>
  );
}