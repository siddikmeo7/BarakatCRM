import React from 'react';

export default function UsageActiveUsers({ rows = [], days = 30 }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">
        Активные пользователи за {days} дн.
      </p>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Пока нет данных об активности</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map(r => (
            <li key={r.user_email || 'unknown'} className="flex items-center justify-between gap-3 py-2">
              <span className="text-xs font-semibold text-foreground truncate">{r.user_email || 'Без аккаунта'}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{r.count} действий</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}