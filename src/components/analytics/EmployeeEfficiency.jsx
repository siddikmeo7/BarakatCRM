import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  startOfDay, endOfDay, isWithinInterval, parseISO, format, subDays,
  isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subWeeks, subMonths
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Users, Calendar, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/formatCompact';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { motion } from 'framer-motion';

function nameFromEmail(email) {
  if (!email) return '';
  const part = email.split('@')[0];
  return part.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const PERIODS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'dayBefore', label: 'Позавчера' },
  { key: 'week', label: 'Неделя' },
  { key: '2weeks', label: '2 недели' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'all', label: 'Всё время' },
];

function getPeriodDates(key) {
  const today = new Date();
  switch (key) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const d = subDays(today, 1); return { from: d, to: d }; }
    case 'dayBefore': { const d = subDays(today, 2); return { from: d, to: d }; }
    case 'week': return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    case '2weeks': return { from: subWeeks(today, 2), to: today };
    case 'month': return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'year': return { from: startOfYear(today), to: endOfYear(today) };
    case 'all': return null;
    default: return { from: today, to: today };
  }
}

export default function EmployeeEfficiency({ sales, canViewProfit = true, hideData = false, lang = 'ru' }) {
  const [periodKey, setPeriodKey] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    const biz = window.__barakatBusiness;
    if (!biz) return;
    Promise.all([
      base44.entities.Employee.filter({ business_id: biz.id }),
      base44.entities.Role.filter({ business_id: biz.id }),
      base44.auth.me().catch(() => null),
    ]).then(([emps, rls, me]) => {
      setEmployees(emps);
      setRoles(rls);
      const ownerName = (me?.email === biz.owner_email ? me?.full_name : '') || nameFromEmail(biz.owner_email) || 'Владелец';
      setOwner({ __isOwner: true, name: ownerName, user_email: biz.owner_email, is_active: true });
    }).catch(() => {});
  }, []);

  const getEmpByEmail = (email) => employees.find(e => e.user_email === email) || null;

  const roleLabelOf = (empRec, fallbackName) => {
    if (empRec?.__isOwner) return 'Владелец';
    if (empRec?.is_admin) return 'Админ';
    if (empRec) {
      const r = roles.find(x => x.id === empRec.role_id);
      return r?.name || 'Сотрудник';
    }
    return fallbackName ? 'Сотрудник' : '';
  };

  const masked = '•••••';

  const period = useCustom && customFrom
    ? { from: new Date(customFrom), to: new Date(customTo || customFrom) }
    : getPeriodDates(periodKey);

  const periodSales = useMemo(() => {
    const base = sales.filter(s => !s.is_cancelled);
    if (!period) return base;
    try {
      const start = startOfDay(period.from);
      const end = endOfDay(period.to || period.from);
      return base.filter(s => {
        const d = parseISO(s.sale_date || s.created_date);
        return isWithinInterval(d, { start, end });
      });
    } catch {
      return [];
    }
  }, [sales, period]);

  const employeeStats = useMemo(() => {
    const map = {};
    // Владелец — всегда в списке
    if (owner) {
      map[owner.user_email] = { name: owner.name, email: owner.user_email, revenue: 0, profit: 0, boxes: 0, count: 0, inactive: false };
    }
    // Сначала сеем ВСЕХ сотрудников бизнеса — чтобы показывались и те, кто не продавал
    employees.forEach(e => {
      const key = e.user_email || e.name || e.id;
      if (!map[key]) {
        map[key] = { name: e.name || e.user_email || 'Сотрудник', email: e.user_email || '', revenue: 0, profit: 0, boxes: 0, count: 0, inactive: !e.is_active || e.is_frozen };
      }
    });
    periodSales.forEach(s => {
      const key = s.seller_email || s.seller_name || 'Неизвестно';
      if (!map[key]) {
        map[key] = { name: s.seller_name || s.seller_email || 'Неизвестно', email: s.seller_email || '', revenue: 0, profit: 0, boxes: 0, count: 0, inactive: false };
      }
      map[key].revenue += s.total_amount || 0;
      map[key].profit += s.profit || 0;
      map[key].boxes += s.boxes_sold || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [periodSales, employees, owner]);

  const totalRevenue = employeeStats.reduce((s, e) => s + e.revenue, 0);
  const totalProfit = employeeStats.reduce((s, e) => s + e.profit, 0);
  const totalBoxes = employeeStats.reduce((s, e) => s + e.boxes, 0);

  const fmt = (v) => hideData ? masked : `${formatCompact(v, lang)} с.`;

  const periodLabel = !period
    ? 'Всё время'
    : isSameDay(period.from, period.to)
      ? format(period.from, 'dd MMM yyyy', { locale: ru })
      : `${format(period.from, 'dd MMM', { locale: ru })} — ${format(period.to, 'dd MMM yyyy', { locale: ru })}`;

  return (
    <div className="tk-mono">
      <div className="tk-sp2" style={{ marginBottom: 10 }}>
        <span className="tk-cap flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {periodLabel} · {periodSales.length} продаж · {totalBoxes} кор.
        </span>
      </div>

      {/* Quick period filters */}
      <div className="tk-grp" style={{ marginBottom: 10 }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => { setPeriodKey(p.key); setUseCustom(false); }}
            className={cn('tk-btn', !useCustom && periodKey === p.key && 'on')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 12 }}>
        <span className="tk-cap">Кастомный период:</span>
        <input
          type="date"
          value={customFrom}
          onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
          className="tk-input"
        />
        <span className="tk-cap">—</span>
        <input
          type="date"
          value={customTo}
          onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
          className="tk-input"
        />
        {useCustom && (
          <button onClick={() => setUseCustom(false)} className="tk-lnk">сбросить</button>
        )}
      </div>

      {/* Totals row */}
      <div className="tk-mat" style={{ gridTemplateColumns: canViewProfit ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', marginBottom: 14 }}>
        <div>
          <span className="tk-cap">Выручка</span>
          <b>{fmt(totalRevenue)}</b>
        </div>
        {canViewProfit && (
          <div>
            <span className="tk-cap">Прибыль</span>
            <b>{fmt(totalProfit)}</b>
          </div>
        )}
        <div>
          <span className="tk-cap">Коробок</span>
          <b>{totalBoxes}</b>
        </div>
      </div>

      {/* Employee list */}
      {employeeStats.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#7c8594', opacity: .4 }} />
          <p className="text-xs" style={{ color: '#7c8594' }}>Нет сотрудников и продаж за выбранный период</p>
        </div>
      ) : (
        <motion.div
          className="space-y-2 max-h-[600px] overflow-y-auto pr-1"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {employeeStats.map((emp, i) => {
            const share = totalRevenue ? ((emp.revenue / totalRevenue) * 100).toFixed(1) : 0;
            const empRec = getEmpByEmail(emp.email);
            // Владелец?
            const isOwner = owner && owner.user_email === emp.email;
            // Статус сотрудника
            const isFrozen = empRec?.is_frozen;
            const isInactive = empRec?.is_active === false;
            const isAdmin = empRec?.is_admin;
            const stChip = isOwner
              ? '#f5b23e'
              : isAdmin
                ? '#d7dbe2'
                : isFrozen
                  ? '#7c8594'
                  : isInactive
                    ? '#7c8594'
                    : '#6ee7b7';
            const stLabel = isOwner ? 'Владелец' : isAdmin ? 'Админ' : isFrozen ? 'Заморожен' : isInactive ? 'Неактивен' : 'Активен';
            const roleLabel = roleLabelOf(isOwner ? owner : empRec, emp.name);
            const float = !isFrozen && !isInactive;
            return (
              <motion.div
                key={emp.email || emp.name + i}
                variants={{
                  hidden: { opacity: 0, x: -16 },
                  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
                }}
                whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 border border-[#232a35] hover:bg-[#171c25] transition-colors",
                  (isFrozen || isInactive) && "opacity-60"
                )}
                style={{ borderRadius: 3 }}
              >
                <motion.div
                  className="relative flex-shrink-0"
                  animate={float ? { y: [0, -3, 0], rotate: [0, 2, 0, -2, 0] } : { y: 0, rotate: 0 }}
                  transition={float ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: (i % 5) * 0.2 } : {}}
                >
                  {isOwner ? (
                    <div className="relative">
                      <div className="w-9 h-9 flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#f5b23e,#f59e0b)', color: '#0b0e13', borderRadius: 4 }}>
                        {emp.name?.charAt(0) || 'В'}
                      </div>
                      <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5" style={{ color: '#f5b23e', fill: '#f5b23e' }} />
                    </div>
                  ) : (
                    <EmployeeAvatar employee={empRec} name={emp.name} sizeClass="w-9 h-9 rounded text-sm" />
                  )}
                  <span
                    className="absolute -top-1 -left-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold"
                    style={{
                      borderRadius: 3,
                      background: i === 0 ? '#f5b23e' : i === 1 ? '#7c8594' : i === 2 ? '#b45309' : '#4b5563',
                      color: '#0b0e13'
                    }}
                  >{i + 1}</span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs truncate" style={{ color: '#f2f4f8' }}>{emp.name}</p>
                    {roleLabel && <span className="text-[10px] truncate hidden sm:inline" style={{ color: '#7c8594' }}>· {roleLabel}</span>}
                    <span className="tk-pill flex-shrink-0" style={{ color: stChip }}>{stLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-0.5" style={{ color: '#7c8594' }}>
                    <span>📦 {emp.boxes} кор.</span>
                    <span>🛒 {emp.count} продаж</span>
                    <span>{share}%</span>
                  </div>
                  <div className="mt-1.5 overflow-hidden" style={{ height: 3, background: '#232a35' }}>
                    <motion.div
                      style={{ height: '100%', background: '#f5b23e' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${share}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-xs" style={{ color: '#f2f4f8' }}>{fmt(emp.revenue)}</p>
                  {canViewProfit && (
                    <p className="text-[11px] font-bold" style={{ color: emp.profit >= 0 ? '#6ee7b7' : '#f87171' }}>
                      {hideData ? masked : `${emp.profit >= 0 ? '+' : ''}${formatCompact(emp.profit, lang)} с.`}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}