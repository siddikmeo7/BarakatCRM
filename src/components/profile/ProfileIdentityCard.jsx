import React from 'react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Верхняя карточка профиля: аватар, имя, роль и бизнес.
// Нажатие открывает раздел «Мои данные», который по умолчанию скрыт.
export default function ProfileIdentityCard({ user, employee, business, roleName, expanded = false, onToggle }) {
  const isOwner = !employee;
  const name = employee?.name || user?.full_name || user?.email || 'Пользователь';
  const roleLabel = isOwner ? '👑 Владелец' : employee?.is_admin ? '👑 Админ' : (roleName || '🛍️ Сотрудник');

  return (
    <button
      type="button"
      onClick={onToggle}
      title={expanded ? 'Свернуть данные профиля' : 'Открыть мои данные'}
      className="group w-full text-left bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 active:scale-[0.99]"
    >
      {/* Одинаково для владельца и сотрудника: фото, стикер и рамка видны всегда.
          При наведении курсора фото и рамка немного увеличиваются. */}
      <div className="flex-none transition-transform duration-200 ease-out group-hover:scale-110">
        <EmployeeAvatar
          employee={employee}
          avatarUrl={employee ? employee.avatar_url : (user?.data?.avatar_url || user?.avatar_url)}
          name={name}
          isAdmin={employee ? employee.is_admin : true}
          profileSticker={employee ? employee.profile_sticker : (user?.data?.profile_sticker || user?.profile_sticker)}
          profileFrame={employee ? employee.profile_frame : (user?.data?.profile_frame || user?.profile_frame)}
          size="md"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 dark:text-white truncate">{name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
        <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {roleLabel}
        </span>
        <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 mt-1.5">
          {expanded ? 'Нажмите, чтобы свернуть' : 'Нажмите, чтобы открыть мои данные'}
        </p>
      </div>

      <div className="flex-none flex items-center gap-2">
        {business?.name && (
          <span className="hidden sm:block text-xs text-slate-400 text-right max-w-[40%] truncate">{business.name}</span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200', expanded && 'rotate-180')} />
      </div>
    </button>
  );
}