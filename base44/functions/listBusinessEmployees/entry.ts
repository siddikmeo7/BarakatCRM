import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/* Список сотрудников и ролей бизнеса.

   Зачем сервер: раздел «Настройки → Сотрудники» должен показывать ВСЮ команду
   и владельцу, и администратору-сотруднику. Прямой запрос из приложения зависит
   от привязки business_id в профиле пользователя, поэтому администратор мог
   видеть только себя. Здесь права проверяются явно, а данные читаются сервисной
   ролью — список полный и одинаковый для владельца и администратора. */

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const businessId = body.business_id;
    if (!businessId) return Response.json({ error: 'business_id is required' }, { status: 400 });

    const userEmail = (user.email || '').toLowerCase().trim();

    const bizList = await base44.asServiceRole.entities.Business.filter({ id: businessId });
    const business = bizList[0];
    if (!business) return Response.json({ error: 'Not found' }, { status: 404 });

    const isOwner = (business.owner_email || '').toLowerCase().trim() === userEmail;

    const employees = await base44.asServiceRole.entities.Employee.filter({ business_id: businessId });
    const me = employees.find(e => (e.user_email || '').toLowerCase().trim() === userEmail);

    // Доступ к полному списку: владелец бизнеса, активный администратор-сотрудник
    // или администратор платформы
    const isAdminEmployee = !!me && me.is_admin === true && me.is_active !== false;
    const isPlatformAdmin = user.role === 'admin' || user.data?.is_platform_admin === true;
    if (!isOwner && !isAdminEmployee && !isPlatformAdmin) {
      console.log('listBusinessEmployees forbidden for:', userEmail);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roles = await base44.asServiceRole.entities.Role.filter({ business_id: businessId });

    return Response.json({
      employees,
      roles,
      is_owner: isOwner,
      is_admin: !!isAdminEmployee
    });
  } catch (error) {
    console.log('listBusinessEmployees error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}