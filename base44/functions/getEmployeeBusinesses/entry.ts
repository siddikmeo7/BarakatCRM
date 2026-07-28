import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Не авторизован' });

    const userEmailLower = (user.email || '').toLowerCase().trim();

    // Load all active employees and filter case-insensitively in code
    // (MongoDB filter is case-sensitive, auth email casing may differ from stored)
    const allEmployees = await base44.asServiceRole.entities.Employee.filter({
      is_active: true
    });

    const employees = allEmployees.filter(e =>
      (e.user_email || '').toLowerCase().trim() === userEmailLower
    );

    if (employees.length === 0) {
      // Also find user-owned businesses
      const ownedBusinesses = await base44.asServiceRole.entities.Business.filter({
        owner_email: user.email
      });
      // Case-insensitive owner_email matching
      const ownedFiltered = ownedBusinesses.filter(b =>
        (b.owner_email || '').toLowerCase().trim() === userEmailLower
      );
      return Response.json({ employees: [], businesses: {}, ownedBusinesses: ownedFiltered });
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

    // Also find user-owned businesses (case-insensitive)
    const ownedBusinesses = await base44.asServiceRole.entities.Business.filter({
      owner_email: user.email
    });
    const ownedFiltered = ownedBusinesses.filter(b =>
      (b.owner_email || '').toLowerCase().trim() === userEmailLower
    );

    return Response.json({
      employees,
      businesses,
      ownedBusinesses: ownedFiltered
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Внутренняя ошибка' });
  }
}