import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, Info, Mail, ChevronRight, Server } from 'lucide-react';

// Переходы из профиля: настройки бизнеса, о системе, контакты
export default function ProfileNavCard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <button
        onClick={() => navigate(createPageUrl('Settings'))}
        className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3 text-left transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">Настройки бизнеса</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Коды доступа, сотрудники, уведомления и оформление</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      <Link
        to="/MigrationPlan"
        className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
          <Server className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">Свой сервер и независимость</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">План переноса приложения на свои серверы</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/About"
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-2.5 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
        >
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">О системе</span>
        </Link>
        <Link
          to="/Contact"
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-2.5 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
        >
          <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Контакты</span>
        </Link>
      </div>
    </div>
  );
}