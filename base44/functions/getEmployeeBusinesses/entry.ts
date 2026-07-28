import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Не авторизован' });

    // Find all employee records for this user (service role — bypass RLS)
    const employees = await base44.asServiceRole.entities.Employee.filter({
      user_email: user.email,
      is_active: true
    });

    if (employees.length === 0) {
      return Response.json({ employees: [], businesses: {} });
    }

    // Load all related businesses (service role — bypass RLS)
    const businesses = {};
    for (const emp of employees) {
      if (!emp.business_id) continue;
      const bizList = await base44.asServiceRole.entities.Business.filter({ id: emp.business_id });
      if (bizList.length > 0) {
        businesses[emp.id] = bizList[0];
      }
    }

    // Also find user-owned businesses
    const ownedBusinesses = await base44.asServiceRole.entities.Business.filter({
      owner_email: user.email
    });

    return Response.json({
      employees,
      businesses,
      ownedBusinesses
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Внутренняя ошибка' });
  }
}