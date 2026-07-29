import React from 'react';
import { Lock } from 'lucide-react';

export default function NoAccess({ message = 'У вас нет прав для просмотра этого раздела.', subMessage = 'Обратитесь к владельцу бизнеса для получения доступа.' }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Нет доступа</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{message}<br />{subMessage}</p>
        </div>
      </div>
    </div>
  );
}