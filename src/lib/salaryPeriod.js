// Единый источник названий периода и графика выплаты зарплаты.
// Используется во всех разделах, где показывается выплата зарплаты,
// чтобы переменные периода были определены в одном месте и не терялись.
import { format, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

export const DEFAULT_PAY_TIME = '10:00';

// Ключ периода выплаты: YYYY-MM
export function getPeriodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Названия текущего месяца (сырое, с заглавной буквы, конец месяца)
export function getSalaryPeriod(now = new Date()) {
  const monthLabelRaw = format(now, 'LLLL yyyy', { locale: ru });
  return {
    periodKey: getPeriodKey(now),
    monthLabelRaw,
    monthLabel: monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1),
    monthStartLabel: format(new Date(now.getFullYear(), now.getMonth(), 1), 'd MMMM', { locale: ru }),
    monthEndLabel: format(endOfMonth(now), 'd LLLL', { locale: ru }),
  };
}

export function getPayDay(schedule) {
  const day = Number(schedule?.pay_day);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

export function getPayTime(schedule) {
  const time = schedule?.pay_time;
  return /^\d{1,2}:\d{2}$/.test(time || '') ? time : DEFAULT_PAY_TIME;
}

// Момент (дата + время), когда зарплата должна быть выплачена в текущем месяце
export function getDueMoment(schedule, now = new Date()) {
  const day = getPayDay(schedule);
  if (!day) return null;
  const [hh, mm] = getPayTime(schedule).split(':').map(Number);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDay), hh || 0, mm || 0, 0, 0);
}

export function formatDueMoment(date) {
  if (!date) return '—';
  try {
    return format(date, 'd MMMM, HH:mm', { locale: ru });
  } catch {
    return '—';
  }
}

export function formatPaidAt(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: ru });
  } catch {
    return '—';
  }
}

export function formatPayDay(schedule) {
  const day = getPayDay(schedule);
  if (!day) return 'График не задан';
  return `${day} числа каждого месяца, ${getPayTime(schedule)}`;
}

// Состояние выплаты сотрудника за текущий месяц:
// due — пора выплатить (день и время уже наступили), upcoming — срок ещё не наступил,
// paid — уже выплачено за этот период, no_schedule — график не задан,
// not_applicable — оклад не фиксированный (считается от продаж).
export function getSalaryDueState({ employee, schedule, payments = [], now = new Date() }) {
  const periodKey = getPeriodKey(now);
  const paid = payments.find(p => p.employee_id === employee?.id && p.period_key === periodKey) || null;
  const dueDate = getDueMoment(schedule, now);
  const isFixed = employee?.salary_method === 'fixed_monthly' && Number(employee?.salary_rate || 0) > 0;

  if (!isFixed) return { status: paid ? 'paid' : 'not_applicable', periodKey, dueDate, paid };
  if (paid) return { status: 'paid', periodKey, dueDate, paid };
  if (!dueDate) return { status: 'no_schedule', periodKey, dueDate: null, paid: null };
  return { status: now >= dueDate ? 'due' : 'upcoming', periodKey, dueDate, paid: null };
}