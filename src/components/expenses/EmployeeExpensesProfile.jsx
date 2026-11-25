import React from 'react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { Receipt } from 'lucide-react';
import { fmtMoney } from './expenseDesign';

// Профиль сотрудника в разделе «Расходы»: он видит, что работает со своими
// расходами и сколько он потратил за выбранный период.
export default function EmployeeExpensesProfile({ employee, total = 0, count = 0, businessName }) {
  return (
    <div className="ex-sheet" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
      <EmployeeAvatar employee={employee} size="md" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <span className="ex-cap">Мой профиль</span>
        <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--ex-ink)' }}>
          {employee?.name || 'Сотрудник'}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ex-muted)' }}>
          {businessName ? `${businessName} · ` : ''}сотрудник
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span className="ex-cap" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          <Receipt className="w-3 h-3" /> Мои расходы
        </span>
        <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--ex-red)' }}>
          −{fmtMoney(total)} с.
        </p>
        <p style={{ margin: 0, fontSize: 10, color: 'var(--ex-muted)' }}>{count} записей</p>
      </div>
    </div>
  );
}