/**
 * Shared business access verification for backend functions.
 * Verifies that the authenticated user is either:
 *  - a platform admin, or
 *  - the owner of the specified business, or
 *  - an active, non-frozen employee of the specified business.
 */
export async function verifyBusinessAccess(base44: any, business_id: string) {
  if (!business_id) {
    return { authorized: false as const, error: 'business_id required', status: 400 };
  }

  let user;
  try {
    user = await base44.auth.me();
  } catch {
    user = null;
  }

  if (!user) {
    return { authorized: false as const, error: 'Unauthorized', status: 401 };
  }

  // Platform admins have access to all businesses
  if (user.role === 'admin') {
    return { authorized: true as const, user };
  }

  // Fetch the business via service role (bypasses RLS for the lookup itself)
  const businesses = await base44.asServiceRole.entities.Business.filter({ id: business_id });
  if (!businesses.length) {
    return { authorized: false as const, error: 'Business not found', status: 404 };
  }
  const business = businesses[0];

  // Owner check (case-insensitive email match)
  if (business.owner_email?.toLowerCase() === user.email?.toLowerCase()) {
    return { authorized: true as const, user, business };
  }

  // Employee check — must be active and not frozen
  const employees = await base44.asServiceRole.entities.Employee.filter({ business_id });
  const employee = employees.find(
    (e: any) =>
      e.user_email?.toLowerCase() === user.email?.toLowerCase() &&
      e.is_active &&
      !e.is_frozen
  );

  if (employee) {
    return { authorized: true as const, user, business, employee };
  }

  return {
    authorized: false as const,
    error: 'Forbidden: you do not have access to this business',
    status: 403,
  };
}