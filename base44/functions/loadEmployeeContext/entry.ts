import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Не авторизован' });

    const body = await req.json().catch(() => ({}));
    const employeeId = body?.employee_id;
    if (!employeeId) return Response.json({ error: 'employee_id required' });

    const userEmailLower = (user.email || '').toLowerCase().trim();

    // Load employee (service role — bypass RLS)
    const empList = await base44.asServiceRole.entities.Employee.filter({ id: employeeId });
    if (empList.length === 0) {
      return Response.json({ error: 'Сотрудник не найден' });
    }
    const emp = empList[0];

    // Security: verify this employee belongs to the current user (case-insensitive)
    if ((emp.user_email || '').toLowerCase().trim() !== userEmailLower) {
      return Response.json({ error: 'Нет доступа к этому профилю сотрудника' });
    }

    if (emp.is_frozen) {
      return Response.json({ error: 'Ваш аккаунт сотрудника заморожен. Обратитесь к владельцу бизнеса.' });
    }

    if (emp.is_active === false) {
      return Response.json({ error: 'Ваш аккаунт сотрудника деактивирован. Обратитесь к владельцу бизнеса.' });
    }

    // Normalize the email in the Employee record if casing differs
    if (emp.user_email !== user.email && emp.user_email?.toLowerCase() === user.email?.toLowerCase()) {
      try {
        await base44.asServiceRole.entities.Employee.update(emp.id, { user_email: user.email });
      } catch (_) {}
    }

    // Привязка бизнеса — только сервером (поле business_id недоступно пользователю).
    // Клиент здесь действует от имени пользователя, поэтому пишем сервисной ролью —
    // сотрудник уже подтверждён: email записи совпадает с email вошедшего.
    if (user.data?.business_id !== emp.business_id) {
      try {
        await base44.asServiceRole.entities.User.update(user.id, { business_id: emp.business_id });
      } catch (_) {}
    }

    // Load business (service role — bypass RLS)
    const bizList = await base44.asServiceRole.entities.Business.filter({ id: emp.business_id });
    const business = bizList[0] || null;

    // Load role (service role — bypass RLS)
    let rolePermissions = null;
    if (emp.role_id) {
      const roleList = await base44.asServiceRole.entities.Role.filter({ id: emp.role_id });
      rolePermissions = roleList[0]?.permissions || null;
    }

    return Response.json({
      employee: emp,
      business,
      role_permissions: rolePermissions
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Внутренняя ошибка' });
  }
}