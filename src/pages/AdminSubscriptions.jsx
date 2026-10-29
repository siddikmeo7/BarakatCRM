import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import BrandedLoader from '@/components/ui/BrandedLoader';
import NoAccess from '@/components/ui/NoAccess';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import SubscriptionOverview from '@/components/subscriptions/SubscriptionOverview';
import SubscriptionEventFeed from '@/components/subscriptions/SubscriptionEventFeed';
import UsageByModule from '@/components/subscriptions/UsageByModule';
import UsageActiveUsers from '@/components/subscriptions/UsageActiveUsers';
import RetentionPolicyPanel from '@/components/subscriptions/RetentionPolicyPanel';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';
const WINDOW_DAYS = 30;

const asList = (res) => (Array.isArray(res) ? res : (res?.items ?? []));
const asRows = (res) => (Array.isArray(res) ? res : (res?.rows ?? []));

export default function AdminSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [events, setEvents] = useState([]);
  const [moduleRows, setModuleRows] = useState([]);
  const [userRows, setUserRows] = useState([]);
  const [policies, setPolicies] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      if (me?.email !== ADMIN_EMAIL) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
      const [biz, pur, ev, byModule, byUser, pol] = await Promise.all([
        base44.entities.Business.list(),
        base44.entities.Base44Purchase.list(),
        base44.entities.SubscriptionEvent.list({ sort: '-occurred_at', limit: 60 }),
        base44.entities.UsageEvent.aggregate({ query: { occurred_at: { $gte: since } }, groupBy: 'module' }).catch(() => []),
        base44.entities.UsageEvent.aggregate({ query: { occurred_at: { $gte: since } }, groupBy: 'user_email' }).catch(() => []),
        base44.entities.DataRetentionPolicy.list(),
      ]);
      setBusinesses(asList(biz));
      setPurchases(asList(pur));
      setEvents(asList(ev));
      setModuleRows(asRows(byModule).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 12));
      setUserRows(asRows(byUser).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 8));
      setPolicies(asList(pol));
    } catch (error) {
      console.error('Error loading subscription stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <BrandedLoader fullScreen message="Загрузка статистики подписок..." />;
  if (!allowed) return <NoAccess message="Статистика подписок доступна только администратору системы." subMessage="Войдите под аккаунтом администратора." />;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Подписки и использование"
        subtitle={`Активные подписки, платежи и активность за ${WINDOW_DAYS} дней`}
        actions={<Button variant="outline" onClick={load} className="rounded-xl gap-2"><RefreshCw className="w-4 h-4" />Обновить</Button>}
      />

      <div className="space-y-4">
        <SubscriptionOverview businesses={businesses} purchases={purchases} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UsageByModule rows={moduleRows} days={WINDOW_DAYS} />
          <UsageActiveUsers rows={userRows} days={WINDOW_DAYS} />
        </div>
        <RetentionPolicyPanel businesses={businesses} policies={policies} onSaved={load} />
        <SubscriptionEventFeed events={events} />
      </div>
    </div>
  );
}