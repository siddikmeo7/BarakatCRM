import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Loader2, Trash2, UserPlus, Building2 } from 'lucide-react';

// Бесплатный доступ по решению администратора: конкретному пользователю или бизнесу целиком.
export default function FreeAccessPanel({ business, onChanged }) {
  const [grants, setGrants] = useState([]);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [forBusiness, forUsers] = await Promise.all([
        base44.entities.AccessGrant.filter({ business_id: business.id }),
        base44.entities.AccessGrant.filter({ scope: 'user' }),
      ]);
      const map = new Map();
      [...forBusiness, ...forUsers].forEach((g) => map.set(g.id, g));
      setGrants(Array.from(map.values()));
    } catch (_) {
      setGrants([]);
    }
  };

  useEffect(() => {
    if (business?.id) load();
  }, [business?.id]);

  const businessGrant = grants.find((g) => g.scope === 'business' && g.is_active !== false);
  const userGrants = grants.filter((g) => g.scope === 'user' && g.is_active !== false);

  const grant = async (fields) => {
    setBusy(true);
    setError('');
    try {
      const me = await base44.auth.me();
      await base44.entities.AccessGrant.create({
        is_active: true,
        reason,
        granted_by_email: me?.email || '',
        ...(expires ? { expires_at: new Date(expires).toISOString() } : {}),
        ...fields,
      });
      setEmail('');
      setReason('');
      setExpires('');
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e?.message || 'Не удалось выдать бесплатный доступ');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (record) => {
    setBusy(true);
    try {
      await base44.entities.AccessGrant.update(record.id, { is_active: false });
      await load();
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-bold text-slate-900 dark:text-white">Бесплатный доступ (без оплаты)</p>
      </div>

      {businessGrant ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Бизнес работает без оплаты
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {businessGrant.reason || 'Причина не указана'}
              {businessGrant.expires_at
                ? ` · до ${new Date(businessGrant.expires_at).toLocaleDateString('ru-RU')}`
                : ' · бессрочно'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => revoke(businessGrant)} disabled={busy}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => grant({ scope: 'business', business_id: business.id })}
          disabled={busy}
          className="gap-2 rounded-full"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          Открыть бесплатный доступ бизнесу
        </Button>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Бесплатный доступ пользователю (по email)
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email пользователя" className="rounded-xl" />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="причина (например: партнёр)" className="rounded-xl" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="rounded-xl sm:max-w-[200px]" />
          <Button
            onClick={() => grant({ scope: 'user', user_email: email.trim().toLowerCase() })}
            disabled={busy || !email.trim()}
            className="gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Выдать доступ
          </Button>
        </div>
        <p className="text-[11px] text-slate-400">
          Пустая дата = бессрочно. Проверка доступа выполняется на сервере при каждом входе.
        </p>
      </div>

      {userGrants.length > 0 && (
        <div className="space-y-1.5">
          {userGrants.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-900 dark:text-white truncate">{g.user_email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {g.reason || 'без причины'}
                  {g.expires_at ? ` · до ${new Date(g.expires_at).toLocaleDateString('ru-RU')}` : ' · бессрочно'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => revoke(g)} disabled={busy}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}