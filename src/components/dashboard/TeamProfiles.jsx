import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { Users, ChevronRight, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const STATUS = {
  owner:    { label: 'Владелец', dot: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',   float: true  },
  admin:    { label: 'Админ',    dot: 'bg-indigo-500',   chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300', float: true  },
  active:   { label: 'Активен',  dot: 'bg-emerald-500',  chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', float: true },
  frozen:   { label: 'Заморожен',dot: 'bg-blue-400',     chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',         float: false },
  inactive: { label: 'Неактивен',dot: 'bg-slate-300',    chip: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',       float: false },
};

function statusOf(emp) {
  if (emp.__isOwner) return 'owner';
  if (emp.is_admin) return 'admin';
  if (emp.is_frozen) return 'frozen';
  if (emp.is_active === false) return 'inactive';
  return 'active';
}

function cardBg(st) {
  if (st === 'frozen') return 'bg-slate-50 border-slate-200 opacity-70';
  if (st === 'inactive') return 'bg-slate-50 border-slate-200 opacity-70';
  return 'bg-slate-50 border-slate-100 hover:bg-indigo-50 hover:border-indigo-200';
}

function nameFromEmail(email) {
  if (!email) return '';
  const part = email.split('@')[0];
  return part.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Карточка «Команда» — показывает ВСЕХ сотрудников + владельца с ролями и статусами.
 * Профили постоянно двигаются (плавают), активные — сильнее.
 */
export default function TeamProfiles() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const biz = window.__barakatBusiness;
    if (!biz) { setLoading(false); return; }
    Promise.all([
      base44.entities.Employee.filter({ business_id: biz.id }),
      base44.entities.Role.filter({ business_id: biz.id }),
      base44.auth.me().catch(() => null),
    ])
      .then(([emps, rls, me]) => {
        const sorted = [...emps].sort((a, b) => {
          if (a.is_frozen !== b.is_frozen) return a.is_frozen ? 1 : -1;
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
          if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
          return 0;
        });
        setEmployees(sorted);
        setRoles(rls);
        // Владелец — синтетическая запись (не сотрудник)
        const ownerName = (me?.email === biz.owner_email ? me?.full_name : '') || nameFromEmail(biz.owner_email) || 'Владелец';
        // Фото, стикер и рамку владельца показываем так же, как у сотрудников
        setOwner({
          __isOwner: true,
          name: ownerName,
          user_email: biz.owner_email,
          is_active: true,
          avatar_url: me?.avatar_url || me?.data?.avatar_url,
          profile_sticker: me?.profile_sticker || me?.data?.profile_sticker,
          profile_frame: me?.profile_frame || me?.data?.profile_frame,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roleName = (emp) => {
    if (emp.__isOwner) return 'Владелец';
    if (emp.is_admin) return 'Админ';
    const r = roles.find(x => x.id === emp.role_id);
    return r?.name || 'Сотрудник';
  };

  const list = owner ? [owner, ...employees] : employees;

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-500" />
          Команда · {list.length}
        </h3>
        <Link to={createPageUrl('Settings')} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
          Все <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-center text-slate-400 py-4 text-xs">Нет сотрудников</p>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {list.map((emp, i) => {
            const st = statusOf(emp);
            const cfg = STATUS[st];
            const role = roleName(emp);
            return (
              <motion.div
                key={emp.id || `owner-${i}`}
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.92 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
                }}
                whileHover={{ y: -6, scale: 1.04, transition: { type: 'spring', stiffness: 300, damping: 16 } }}
                className={cn("relative flex items-center gap-2 p-2 rounded-xl border transition-colors cursor-default", cardBg(st))}
                title={emp.is_frozen ? 'Аккаунт заморожен' : emp.user_email}
              >
                {/* Постоянно двигающийся аватар */}
                <motion.div
                  animate={cfg.float
                    ? { y: [0, -4, 0], rotate: [0, 2, 0, -2, 0] }
                    : { y: 0, rotate: 0 }}
                  transition={cfg.float
                    ? { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: (i % 4) * 0.25 }
                    : {}}
                  className="flex-shrink-0"
                >
                  {emp.__isOwner ? (
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {emp.name?.charAt(0) || 'В'}
                      </div>
                      <Crown className="absolute -top-1.5 -right-1 w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                    </div>
                  ) : (
                    <EmployeeAvatar employee={emp} name={emp.name} isAdmin={emp.is_admin} size="sm" />
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{role}</p>
                  <span className={cn("inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold", cfg.chip)}>
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full", cfg.dot, cfg.float && "animate-pulse")} />
                    {cfg.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}