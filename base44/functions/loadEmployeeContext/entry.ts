import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Не авторизован' }, { status: 401 });

    const body = await req.json();
    const employeeId = body?.employee_id;
    if (!employeeId) return Response.json({ error: 'employee_id required' }, { status: 400 });

    // Load employee (service role — bypass RLS)
    const empList = await base44.asServiceRole.entities.Employee.filter({ id: employeeId });
    if (empList.length === 0) {
      return Response.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }
    const emp = empList[0];

    // Security: verify this employee belongs to the current user
    if (emp.user_email !== user.email) {
      return Response.json({ error: 'Нет доступа к этому профилю сотрудника' }, { status: 403 });
    }

    if (emp.is_frozen) {
      return Response.json({ error: 'Ваш аккаунт сотрудника заморожен. Обратитесь к владельцу бизнеса.' }, { status: 403 });
    }

    if (emp.is_active === false) {
      return Response.json({ error: 'Ваш аккаунт сотрудника деактивирован. Обратитесь к владельцу бизнеса.' }, { status: 403 });
    }

    // Update business_id on user for RLS (user-scoped client updates token)
    if (user.data?.business_id !== emp.business_id) {
      await base44.auth.updateMe({ business_id: emp.business_id });
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
    return Response.json({ error: error.message || 'Внутренняя ошибка' }, { status: 500 });
  }
}