import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Loader2 } from 'lucide-react';

// Хранение данных настраивается отдельно от подписки:
// отмена подписки закрывает доступ, но не удаляет данные бизнеса.
export default function RetentionPolicyPanel({ businesses = [], policies = [], onSaved }) {
  const [businessId, setBusinessId] = useState('');
  const [months, setMonths] = useState('0');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const policy = policies.find(p => p.business_id === businessId);
    setMonths(String(policy?.retention_months ?? 0));
    setNote(policy?.note || '');
    setSaved(false);
  }, [businessId, policies]);

  const save = async () => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const payload = {
        business_id: business.id,
        business_name: business.name || '',
        retention_months: Number(months) || 0,
        note,
        updated_by_email: me?.email || '',
      };
      const existing = policies.find(p => p.business_id === business.id);
      if (existing) await base44.entities.DataRetentionPolicy.update(existing.id, payload);
      else await base44.entities.DataRetentionPolicy.create(payload);
      setSaved(true);
      await onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none">
          <ShieldCheck className="w-[18px] h-[18px]" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Хранение данных</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Отмена подписки закрывает доступ к сервису, но данные бизнеса остаются. Удаление выполняется только
            вручную — владельцем бизнеса или по его запросу, с учётом требований законодательства.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground mb-1">Бизнес</label>
          <select
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Выберите бизнес</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name || b.owner_email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground mb-1">Месяцев</label>
          <Input type="number" min="0" value={months} onChange={(e) => setMonths(e.target.value)} />
        </div>
        <Button onClick={save} disabled={!businessId || saving} className="h-10 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
        </Button>
      </div>

      {businessId && (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground mb-1">
            Причина срока хранения
          </label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: требование бухгалтерии — 5 лет" />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {months && Number(months) > 0
          ? `Данные хранятся ${months} мес. после окончания подписки, затем могут быть удалены по решению владельца.`
          : 'Срок не ограничен: данные хранятся бессрочно, пока владелец не удалит их сам.'}
        {saved ? ' Настройка сохранена.' : ''}
      </p>
    </div>
  );
}