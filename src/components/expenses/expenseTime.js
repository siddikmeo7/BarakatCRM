import { format, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

// Дата расхода — только календарный день. Дата хранится как date-time,
// поэтому берём первые 10 символов: иначе часовой пояс сдвигает время.
export const formatExpenseDay = (value) => {
  if (!value) return '—';
  const day = String(value).slice(0, 10);
  const d = parseISO(day);
  return isValid(d) ? format(d, 'dd.MM.yyyy') : '—';
};

// Момент, когда расход был добавлен в систему: точная дата и время в 24-часовом
// формате (HH — часы от 00 до 23), по местному времени того, кто смотрит.
export const formatAddedAt = (value, withDate = true) => {
  if (!value) return '—';
  const d = new Date(value);
  if (!isValid(d)) return '—';
  return format(d, withDate ? 'dd.MM.yyyy, HH:mm' : 'HH:mm');
};

// Запасной формат для истории изменений (месяц словами, время 24 ч)
export const formatMoment = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return isValid(d) ? format(d, 'dd MMM yyyy, HH:mm', { locale: ru }) : '—';
};