import { format, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

// Дата расхода — только календарный день. Дата хранится как date-time,
// поэтому берём первые 10 символов: иначе часовой пояс сдвигает время.
export const formatExpenseDay = (value) => {
  if (!value) return '—';
  const day = String(value).slice(0, 10);
  const d = parseISO(day);
  return isValid(d) ? format(d, 'dd MMM yyyy', { locale: ru }) : '—';
};

// Момент, когда расход был добавлен в систему — по местному времени сотрудника.
export const formatAddedAt = (value, withDate = true) => {
  if (!value) return '—';
  const d = new Date(value);
  if (!isValid(d)) return '—';
  return format(d, withDate ? 'dd MMM yyyy, HH:mm' : 'HH:mm', { locale: ru });
};