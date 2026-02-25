import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Copy, RotateCw, LogIn, Check, AlertCircle } from 'lucide-react';

export default function EmployeeDetailDialog({ employee, open, onOpenChange, onUpdate }) {
  const [showCode, setShowCode] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState('');
  const [message, setMessage] = useState('');

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const generateNewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    setMessage('');
    try {
      const newCode = generateNewCode();
      await base44.entities.Employee.update(employee.id, {
        login_session_token: newCode,
      });
      setMessage('✅ Код изменён');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage('❌ Ошибка при изменении кода');
    } finally {
      setRegenerating(false);
    }
  };

  if (!employee) return null;

  const refreshedEmp = employee; // в реальном приложении можно перезагрузить данные

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Аккаунт сотрудника</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
            <p className="text-xs text-slate-500">{employee.role}</p>
            {employee.is_frozen && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <AlertCircle className="w-3.5 h-3.5" />
                Аккаунт заморожен
              </div>
            )}
            {employee.is_admin && (
              <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">
                👑 Администратор
              </div>
            )}
          </div>

          {/* Login Credentials */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-900">🔑 Данные для входа</p>

            {/* Email */}
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <p className="text-xs text-slate-500 mb-1">Email</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-mono font-semibold text-slate-900 break-all">
                  {employee.user_email}
                </p>
                <button
                  onClick={() => handleCopy(employee.user_email, 'email')}
                  className="p-1.5 hover:bg-indigo-50 rounded flex-shrink-0"
                  title="Копировать email"
                >
                  {copied === 'email' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-indigo-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Access Code */}
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <p className="text-xs text-slate-500 mb-1">Код входа</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-mono font-bold text-indigo-700 tracking-widest">
                  {showCode ? employee.login_session_token || 'N/A' : '••••••••'}
                </p>
                <button
                  onClick={() => handleCopy(employee.login_session_token, 'code')}
                  className="p-1.5 hover:bg-indigo-50 rounded flex-shrink-0"
                  title="Копировать код"
                >
                  {copied === 'code' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-indigo-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Regenerate code button */}
            <Button
              onClick={handleRegenerateCode}
              disabled={regenerating}
              variant="outline"
              className="w-full text-sm"
            >
              <RotateCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Изменяется...' : 'Изменить код'}
            </Button>

            {message && (
              <div className={`text-xs text-center p-2 rounded ${message.startsWith('✅') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {message}
              </div>
            )}
          </div>

          {/* Last login */}
          {employee.last_login_at && (
            <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Последний вход</p>
                <p className="text-xs font-medium text-slate-800">
                  {format(new Date(employee.last_login_at), 'dd MMM, HH:mm', { locale: dateFnsRu })}
                  {' '}
                  <span className="text-slate-400">
                    ({formatDistanceToNow(new Date(employee.last_login_at), { addSuffix: true, locale: dateFnsRu })})
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Close button */}
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}