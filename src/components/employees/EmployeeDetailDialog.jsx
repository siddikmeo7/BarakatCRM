import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Copy, RotateCw, LogIn, Check, AlertCircle, Upload, User, Eye, EyeOff, Trash2 } from 'lucide-react';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

export default function EmployeeDetailDialog({ employee, open, onOpenChange, onUpdate }) {
  const [showCode, setShowCode] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.entities.Employee.update(employee.id, { avatar_url: file_url });
      setMessage('✅ Аватар загружен');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage('❌ Ошибка при загрузке');
    } finally {
      setUploading(false);
    }
  };

  const handlePermanentDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.Employee.delete(employee.id);
      onOpenChange(false);
      onUpdate();
    } catch (err) {
      setMessage('❌ Ошибка при удалении');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
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
           {/* Avatar section */}
           <div className="flex flex-col items-center gap-3 pb-4 border-b">
             <EmployeeAvatar employee={employee} sizeClass="w-20 h-20 text-3xl" />
             <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition cursor-pointer">
               <Upload className="w-3.5 h-3.5" />
               {uploading ? 'Загрузка...' : 'Загрузить фото'}
               <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
             </label>
           </div>

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

          {/* Permanent delete */}
          {confirmDelete ? (
            <div className="space-y-2">
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg leading-relaxed">
                Сотрудник будет полностью удалён из системы. Профиль исчезнет из списков сотрудников, главной и аналитики, но история его продаж сохранится. Действие необратимо.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>Отмена</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handlePermanentDelete} disabled={deleting}>
                  {deleting ? 'Удаление...' : 'Удалить навсегда'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 gap-2" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-4 h-4" /> Полностью удалить сотрудника
            </Button>
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