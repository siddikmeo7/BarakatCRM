import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AvatarDisplay } from '@/components/settings/AvatarPicker';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import ProfilePhotoZoom from '@/components/settings/ProfilePhotoZoom';
import { format } from 'date-fns';
import { Flame, Calendar, User as UserIcon, ArrowLeftRight, LogOut, ChevronRight, Clock } from 'lucide-react';
import { computeStreak, getTotalLoginDays } from '@/lib/loginTracker';

export default function ProfileCard({ user, currentEmployee, business, lang, onOpenProfile, onSwitchAccount, onLogout, onAvatarSave, loadData }) {
  const [streak] = useState(() => computeStreak(user?.email));
  const [totalDays] = useState(() => getTotalLoginDays(user?.email));
  const [zoomOpen, setZoomOpen] = useState(false);

  const avatarUrl = currentEmployee?.avatar_url || user?.avatar_url || user?.data?.avatar_url;
  const displayName = currentEmployee?.name || user?.full_name || 'Пользователь';

  const roleBadge = !currentEmployee
    ? { icon: '👑', label: 'Владелец', bg: 'bg-indigo-500', text: 'text-white' }
    : currentEmployee.is_admin
      ? { icon: '🛡️', label: 'Администратор', bg: 'bg-emerald-500', text: 'text-white' }
      : { icon: '👤', label: 'Сотрудник', bg: 'bg-slate-500', text: 'text-white' };

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
      {/* Header gradient banner */}
      <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      {/* Profile content */}
      <div className="bg-white dark:bg-slate-900 px-5 pb-5 -mt-12 relative">
        {/* Avatar + Name */}
        <div className="flex items-end gap-4 mb-4">
          <div onDoubleClick={() => setZoomOpen(true)} title="Двойной клик — увеличить" className="cursor-zoom-in flex-shrink-0">
            <EmployeeAvatar
              employee={currentEmployee}
              avatarUrl={avatarUrl}
              name={displayName}
              isAdmin={currentEmployee?.is_admin}
              profileSticker={currentEmployee?.profile_sticker || user?.data?.profile_sticker || user?.profile_sticker}
              profileFrame={currentEmployee?.profile_frame || user?.data?.profile_frame || user?.profile_frame}
              sizeClass="w-20 h-20 rounded-2xl text-2xl"
            />
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-slate-900 dark:text-white text-lg truncate">{displayName}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${roleBadge.bg} ${roleBadge.text} rounded-full text-xs font-bold`}>
                {roleBadge.icon} {roleBadge.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Streak + Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800/30 text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{streak}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">дней подряд</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800/30 text-center">
            <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalDays}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">всего дней</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/30 text-center">
            <Clock className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {user?.created_date ? Math.floor((Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24)) : 0}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">в системе</p>
          </div>
        </div>

        {/* Business quick info */}
        {business && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{business.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{business.name}</p>
              <p className="text-xs text-slate-400">Текущий бизнес</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Онлайн
            </span>
          </div>
        )}

        {/* Profile button - main action */}
        <Button
          onClick={onOpenProfile}
          className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md mb-2"
        >
          <UserIcon className="w-4 h-4" />
          Мой профиль
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-2 text-xs" onClick={onSwitchAccount}>
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Сменить аккаунт
          </Button>
          <Button variant="outline" className="gap-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={onLogout}>
            <LogOut className="w-3.5 h-3.5" />
            Выйти
          </Button>
        </div>
      </div>
      <ProfilePhotoZoom open={zoomOpen} onClose={() => setZoomOpen(false)} avatarUrl={avatarUrl} name={displayName} isAdmin={currentEmployee?.is_admin} profileSticker={currentEmployee?.profile_sticker || user?.data?.profile_sticker || user?.profile_sticker} profileFrame={currentEmployee?.profile_frame || user?.data?.profile_frame || user?.profile_frame} />
    </div>
  );
}