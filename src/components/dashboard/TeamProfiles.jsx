import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Карточка «Команда» — показывает ВСЕХ сотрудников бизнеса с их профилями
 * (аватар, имя, роль). Используется на Главной.
 */
export default function TeamProfiles() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const biz = window.__barakatBusiness;
    if (!biz) { setLoading(false); return; }
    Promise.all([
      base44.entities.Employee.filter({ business_id: biz.id }),
      base44.entities.Role.filter({ business_id: biz.id }),
    ])
      .then(([emps, rls]) => {
        // Сначала активные, потом неактивные; замороженных в конец
        const sorted = [...emps].sort((a, b) => {
          if (a.is_frozen !== b.is_frozen) return a.is_frozen ? 1 : -1;
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
          return 0;
        });
        setEmployees(sorted);
        setRoles(rls);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roleName = (emp) => {
    if (emp.is_admin) return 'Админ';
    const r = roles.find(x => x.id === emp.role_id);
    return r?.name || 'Сотрудник';
  };

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-500" />
          Команда · {employees.length}
        </h3>
        <Link to={createPageUrl('Settings')} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
          Все <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <p className="text-center text-slate-400 py-4 text-xs">Нет сотрудников</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                emp.is_frozen
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : emp.is_active
                    ? 'bg-slate-50 border-slate-100 hover:bg-indigo-50'
                    : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
              title={emp.is_frozen ? 'Аккаунт заморожен' : emp.user_email}
            >
              <EmployeeAvatar employee={emp} name={emp.name} isAdmin={emp.is_admin} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{emp.name}</p>
                <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${emp.is_frozen ? 'bg-blue-400' : emp.is_active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  {roleName(emp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}