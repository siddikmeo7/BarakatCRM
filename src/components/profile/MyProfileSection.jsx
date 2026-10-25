import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ProfileStylePicker from '@/components/settings/ProfileStylePicker';
import ProfileDetailDialog from '@/components/settings/ProfileDetailDialog';
import { Pencil, Phone, MessageCircle, Send, Calendar, User as UserIcon, Palette, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Личные данные пользователя и их изменение — это раздел «Профиль».
// Работает и для владельца, и для сотрудника: форма сама сохраняет в нужную запись.
export default function MyProfileSection({ user, employee, business, roleName, onSaved }) {
  const [editOpen, setEditOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const rows = [
    { icon: UserIcon, label: 'Полное имя', value: employee?.full_name || employee?.name || user?.full_name || '—' },
    { icon: Phone, label: 'Телефон 1', value: employee?.phone || user?.data?.phone || '—' },
    { icon: Phone, label: 'Телефон 2', value: employee?.phone2 || user?.data?.phone2 || '—' },
    { icon: MessageCircle, label: 'WhatsApp', value: employee?.whatsapp || user?.data?.whatsapp || '—' },
    { icon: Send, label: 'Telegram', value: employee?.telegram || user?.data?.telegram || '—' },
    { icon: Calendar, label: 'Возраст', value: employee?.age || user?.data?.age || '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Мои данные</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {roleName || (employee?.is_admin ? 'Администратор' : employee ? 'Сотрудник' : 'Владелец бизнеса')}
            </p>
          </div>
          <Button onClick={() => setEditOpen(true)} className="gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700">
            <Pencil className="w-4 h-4" />
            Изменить
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <row.icon className="w-4 h-4 text-slate-400 flex-none" />
              <span className="text-xs text-slate-400">{row.label}</span>
              <span className="ml-auto text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Блок оформления открывается по кнопке, а не сразу */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setStyleOpen(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <Palette className="w-4 h-4 text-emerald-600 flex-none" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Фото, рамка и стикер профиля</span>
          <span className="ml-auto text-xs text-slate-400">{styleOpen ? 'Скрыть' : 'Открыть'}</span>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 flex-none transition-transform", styleOpen && "rotate-180")} />
        </button>
        {styleOpen && (
          <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <ProfileStylePicker currentEmployee={employee} user={user} onSaved={onSaved} />
          </div>
        )}
      </div>

      <ProfileDetailDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
        currentEmployee={employee}
        business={business}
        onProfileUpdated={onSaved}
      />
    </div>
  );
}