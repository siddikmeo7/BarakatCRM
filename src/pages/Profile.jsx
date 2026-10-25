import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import BrandedLoader from '@/components/ui/BrandedLoader';
import SubscriptionDialog from '@/components/subscription/SubscriptionDialog';
import ProfileIdentityCard from '@/components/profile/ProfileIdentityCard';
import ProfileBusinessCard from '@/components/profile/ProfileBusinessCard';
import ProfileSubscriptionCard from '@/components/profile/ProfileSubscriptionCard';
import PaymentHistoryCard from '@/components/profile/PaymentHistoryCard';
import ProfileNavCard from '@/components/profile/ProfileNavCard';
import MyProfileSection from '@/components/profile/MyProfileSection';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

export default function Profile() {
  const employee = window.__barakatEmployee || null;
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(window.__barakatBusiness || null);
  const [roleName, setRoleName] = useState('');
  const [loading, setLoading] = useState(true);
  const [subOpen, setSubOpen] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!employee?.role_id || employee.is_admin) return;
    base44.entities.Role.filter({ id: employee.role_id })
      .then(r => setRoleName(r[0]?.name || ''))
      .catch(() => setRoleName(''));
  }, [employee?.role_id, employee?.is_admin]);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      await refreshBusiness(window.__barakatBusiness?.id || business?.id);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const refreshBusiness = async (id = business?.id) => {
    if (!id) return;
    const fresh = await base44.entities.Business.filter({ id });
    if (fresh?.[0]) {
      setBusiness(fresh[0]);
      window.__barakatBusiness = fresh[0];
    }
  };

  if (loading) return <BrandedLoader fullScreen message="Загрузка профиля..." />;

  const isOwner = !employee;
  const isPlatformAdmin = user?.email === ADMIN_EMAIL;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Профиль</h1>

      <ProfileIdentityCard user={user} employee={employee} business={business} roleName={roleName} />
      <MyProfileSection
        user={user}
        employee={employee}
        business={business}
        roleName={roleName}
        onSaved={load}
      />
      <ProfileBusinessCard business={business} showCodes={isOwner || !!employee?.is_admin} />
      <ProfileSubscriptionCard
        business={business}
        isPlatformAdmin={isPlatformAdmin}
        canPay={isOwner || isPlatformAdmin}
        onPay={() => setSubOpen(true)}
        onRefresh={() => refreshBusiness()}
      />
      <PaymentHistoryCard ownerEmail={business?.owner_email} />
      <ProfileNavCard showServerPlan={isOwner || isPlatformAdmin || !!employee?.is_admin} />

      <SubscriptionDialog
        business={business}
        open={subOpen}
        onOpenChange={setSubOpen}
        onRefresh={() => refreshBusiness()}
        canPay={isOwner || isPlatformAdmin}
      />
    </div>
  );
}