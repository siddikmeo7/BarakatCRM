import React from 'react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

// Верхняя карточка профиля: аватар, имя, роль и бизнес
export default function ProfileIdentityCard({ user, employee, business, roleName }) {
  const isOwner = !employee;
  const name = employee?.name || user?.full_name || user?.email || 'Пользователь';
  const roleLabel = isOwner ? '👑 Владелец' : employee?.is_admin ? '👑 Админ' : (roleName || '🛍️ Сотрудник');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
      {/* Одинаково для владельца и сотрудника: фото, стикер и рамка видны всегда */}
      <EmployeeAvatar
        employee={employee}
        avatarUrl={employee ? employee.avatar_url : (user?.data?.avatar_url || user?.avatar_url)}
        name={name}
        isAdmin={employee ? employee.is_admin : true}
        profileSticker={employee ? employee.profile_sticker : (user?.data?.profile_sticker || user?.profile_sticker)}
        profileFrame={employee ? employee.profile_frame : (user?.data?.profile_frame || user?.profile_frame)}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 dark:text-white truncate">{name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
        <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {roleLabel}
        </span>
      </div>
      {business?.name && (
        <span className="hidden sm:block text-xs text-slate-400 text-right max-w-[40%] truncate">{business.name}</span>
      )}
    </div>
  );
}