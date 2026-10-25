import React from 'react';
import { format } from 'date-fns';
import { Building2, Phone, MapPin, CalendarDays, KeyRound, Mail } from 'lucide-react';

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words">{value}</p>
      </div>
    </div>
  );
}

// Данные бизнеса владельца/сотрудника
export default function ProfileBusinessCard({ business, showCodes }) {
  if (!business) return null;
  const phones = [business.phone, business.phone2].filter(Boolean).join(' · ');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 dark:text-white truncate">{business.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Данные вашего бизнеса</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 pt-1">
        <InfoRow icon={Mail} label="Владелец" value={business.owner_email} />
        <InfoRow icon={Phone} label="Телефон" value={phones} />
        <InfoRow icon={MapPin} label="Адрес" value={business.address} />
        <InfoRow
          icon={CalendarDays}
          label="Дата регистрации"
          value={business.created_date ? format(new Date(business.created_date), 'dd.MM.yyyy') : ''}
        />
        {showCodes && <InfoRow icon={KeyRound} label="Код бизнеса" value={business.business_code} />}
        {showCodes && <InfoRow icon={KeyRound} label="Код доступа сотрудников" value={business.access_code} />}
      </div>
    </div>
  );
}