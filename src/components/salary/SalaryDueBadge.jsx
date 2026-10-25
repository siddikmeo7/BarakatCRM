import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, CalendarOff } from 'lucide-react';
import { formatDueMoment, formatPaidAt } from '@/lib/salaryPeriod';

/**
 * Индикатор состояния выплаты зарплаты сотруднику за текущий месяц.
 * due — мигает: день и время выплаты наступили, зарплата ещё не выдана.
 */
export default function SalaryDueBadge({ state }) {
  if (!state) return null;

  if (state.status === 'due') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-salary-due whitespace-nowrap">
        <AlertTriangle className="w-3 h-3" />
        Пора выплатить
      </span>
    );
  }

  if (state.status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3" />
        Выплачено {formatPaidAt(state.paid?.paid_at)}
      </span>
    );
  }

  if (state.status === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium whitespace-nowrap">
        <Clock className="w-3 h-3" />
        Выплата {formatDueMoment(state.dueDate)}
      </span>
    );
  }

  if (state.status === 'no_schedule') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium whitespace-nowrap">
        <CalendarOff className="w-3 h-3" />
        График не задан
      </span>
    );
  }

  return null;
}