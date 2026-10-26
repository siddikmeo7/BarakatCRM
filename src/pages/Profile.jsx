import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import BrandedLoader from '@/components/ui/BrandedLoader';
import SubscriptionDialog from '@/components/subscription/SubscriptionDialog';
import ProfileIdentityCard from '@/components/profile/ProfileIdentityCard';
import ProfileBusinessCard from '@/components/profile/ProfileBusinessCard';
import ProfileSubscriptionCard from '@/components/profile/ProfileSubscriptionCard';
import PaymentHistoryCard from '@/components/profile/PaymentHistoryCard';
import ProfileNavCard from '@/components/profile/ProfileNavCard';
import StyleStudio from '@/components/profile/StyleStudio';
import MyProfileSection from '@/components/profile/MyProfileSection';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

export default function Profile() {
  const [employee, setEmployee] = useState(window.__barakatEmployee || null);
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(window.__barakatBusiness || null);
  const [roleName, setRoleName] = useState('');
  const [loading, setLoading] = useState(true);
  const [subOpen, setSubOpen] = useState(false);
  // Личные данные скрыты по умолчанию и открываются нажатием на карточку профиля
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      await refreshEmployee();
      await refreshBusiness(window.__barakatBusiness?.id || business?.id);
      // Сообщаем остальным разделам (меню, аватары), что профиль изменился
      window.dispatchEvent(new Event('barakatProfileUpdated'));
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  // Перечитываем запись сотрудника: фото, стикер, рамка и личные данные
  // должны отображаться сразу после сохранения, без перезагрузки страницы.
  const refreshEmployee = async () => {
    const id = window.__barakatEmployee?.id;
    if (!id) return;
    const fresh = (await base44.entities.Employee.filter({ id }))[0];
    if (fresh) {
      setEmployee(fresh);
      window.__barakatEmployee = fresh;
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
    <div className="w-full space-y-4 pb-24">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Профиль</h1>

      <ProfileIdentityCard
        user={user}
        employee={employee}
        business={business}
        roleName={roleName}
        expanded={detailsOpen}
        onToggle={() => setDetailsOpen(v => !v)}
      />

      {/* Данные идут одним списком сверху вниз — прокручиваешь и просматриваешь по порядку */}
      <AnimatePresence initial={false}>
        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <MyProfileSection
              user={user}
              employee={employee}
              business={business}
              roleName={roleName}
              onSaved={load}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileBusinessCard business={business} showCodes={isOwner || !!employee?.is_admin} />

      <ProfileSubscriptionCard
        business={business}
        isPlatformAdmin={isPlatformAdmin}
        canPay={isOwner || isPlatformAdmin}
        onPay={() => setSubOpen(true)}
        onRefresh={() => refreshBusiness()}
      />

      <PaymentHistoryCard ownerEmail={business?.owner_email} />

      <StyleStudio />

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