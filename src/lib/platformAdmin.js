// Кто видит админ-панель: администратор системы (владелец платформы).
// Флаг is_platform_admin задаётся в профиле пользователя на сервере;
// старые админские почты поддерживаются для совместимости.
export const LEGACY_ADMIN_EMAILS = ['siddikme2007@gmail.com'];

export function isPlatformAdmin(user) {
  if (!user) return false;
  if (user.data?.is_platform_admin === true || user.is_platform_admin === true) return true;
  const email = (user.email || '').toLowerCase().trim();
  return LEGACY_ADMIN_EMAILS.includes(email);
}