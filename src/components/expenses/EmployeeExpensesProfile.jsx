import React from 'react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { Receipt } from 'lucide-react';
import { fmtMoney } from './expenseDesign';

// Профиль сотрудника в разделе «Расходы»: он видит, что работает со своими
// расходами и сколько он потратил за выбранный период.
export default function EmployeeExpensesProfile({ employee, total = 0, count = 0, businessName }) {
  return (
    <div className="ep-profile">
      <EmployeeAvatar employee={employee} size="md" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <span className="ep-cap">Мой профиль</span>
        <p className="ep-profile-name">{employee?.name || 'Сотрудник'}</p>
        <p className="ep-profile-sub">{businessName ? `${businessName} · ` : ''}сотрудник</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span className="ep-cap" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Receipt style={{ width: 12, height: 12 }} /> Мои расходы
        </span>
        <p className="ep-profile-total">−{fmtMoney(total)} с.</p>
        <p className="ep-profile-count">{count} записей</p>
      </div>
    </div>
  );
}