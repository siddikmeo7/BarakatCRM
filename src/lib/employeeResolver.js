// Общий помощатель для отображения сотрудников в исторических записях.
// Если сотрудник удалён (soft-delete: deleted_at заполнен) — помечаем isDeleted.
// Если запись сотрудника совсем не найдена по email, но есть snapshot-имя —
// тоже считаем удалённым (жёстко удалённые раньше), показываем красную пометку.

export function resolveEmployee(email, fallbackName, employees, ownerEmail = '') {
  const emp = email ? (employees?.find(e => e.user_email === email) || null) : null;
  const isOwner = !!email && !!ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase();
  const isDeleted = !isOwner && (!!emp?.deleted_at || (!emp && !!(fallbackName || email)));
  const name = emp?.name || fallbackName || (email ? email.split('@')[0] : 'Неизвестный');
  return { employee: emp, name, isDeleted, isOwner };
}