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

    // Ищем существующую запись сотрудника в ЭТОМ бизнесе (service role — обходим RLS)
    const existingEmps = await base44.asServiceRole.entities.Employee.filter({
      user_email: user.email,
      business_id: biz.id
    });

    if (existingEmps.length === 0) {
      // Сотрудник не зарегистрирован в этом бизнесе
      return Response.json({
        error: 'Вы не зарегистрированы как сотрудник в этом бизнесе. Попросите владельца бизнеса добавить вас в список сотрудников, после чего вы сможете войти.'
      }, { status: 403 });
    }

    const emp = existingEmps[0];

    if (emp.is_frozen) {
      return Response.json({
        error: 'Ваш аккаунт сотрудника заморожен. Обратитесь к владельцу бизнеса.'
      }, { status: 403 });
    }

    if (emp.is_active === false) {
      return Response.json({
        error: 'Ваш аккаунт сотрудника деактивирован. Обратитесь к владельцу бизнеса.'
      }, { status: 403 });
    }

    // Update business_id on user for RLS (updates token immediately)
    if (user.data?.business_id !== biz.id) {
      await base44.auth.updateMe({ business_id: biz.id });
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