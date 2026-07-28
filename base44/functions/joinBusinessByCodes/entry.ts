import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Не авторизован' }, { status: 401 });

    const body = await req.json();
    const businessCode = (body?.businessCode || '').trim();
    const accessCode = (body?.accessCode || '').trim();

    if (!businessCode || !accessCode) {
      return Response.json({ error: 'Введите код бизнеса и код доступа' }, { status: 400 });
    }

    // Service role — обходим RLS, чтобы найти бизнес по коду
    const bizList = await base44.asServiceRole.entities.Business.filter({ business_code: businessCode });
    if (bizList.length === 0) {
      return Response.json({ error: 'Бизнес с таким кодом не найден. Проверьте код бизнеса.' }, { status: 404 });
    }
    const biz = bizList[0];

    if (biz.access_code !== accessCode) {
      return Response.json({ error: 'Неверный код доступа. Проверьте код доступа.' }, { status: 403 });
    }

    if (biz.is_active === false) {
      return Response.json({ error: 'Этот бизнес неактивен. Обратитесь к владельцу.' }, { status: 403 });
    }

    // Ищем существующую запись сотрудника (service role — обходим RLS)
    const existingEmps = await base44.asServiceRole.entities.Employee.filter({
      user_email: user.email,
      business_id: biz.id
    });

    let emp;
    if (existingEmps.length > 0) {
      emp = existingEmps[0];
      if (emp.is_frozen) {
        return Response.json({ error: 'Ваш аккаунт сотрудника заморожен. Обратитесь к владельцу бизнеса.' }, { status: 403 });
      }
      if (!emp.is_active) {
        // Реактивируем
        emp = await base44.asServiceRole.entities.Employee.update(emp.id, {
          is_active: true,
          last_login_at: new Date().toISOString()
        });
      }
    } else {
      // Находим роль по умолчанию
      const defaultRoles = await base44.asServiceRole.entities.Role.filter({
        business_id: biz.id,
        is_default: true
      });
      const roleId = defaultRoles.length > 0 ? defaultRoles[0].id : null;

      emp = await base44.asServiceRole.entities.Employee.create({
        business_id: biz.id,
        user_email: user.email,
        name: user.full_name || user.email.split('@')[0],
        role_id: roleId || '',
        is_active: true,
        is_frozen: false,
        is_admin: false,
        last_login_at: new Date().toISOString(),
        device_info: ''
      });
    }

    return Response.json({
      success: true,
      employee_id: emp.id,
      business_id: biz.id,
      business_name: biz.name,
      employee_name: emp.name,
      is_admin: emp.is_admin || false
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Внутренняя ошибка' }, { status: 500 });
  }
}