import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

// Удаление имени из списка «От имени» в три этапа:
// 1) кнопка «Удалить» в списке, 2) вопрос «Вы уверены?», 3) ввод имени сотрудника.
export default function DeleteSpentByNameDialog({ open, name, isEmployee, onOpenChange, onConfirm }) {
  const [step, setStep] = useState(1);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setTyped('');
      setBusy(false);
    }
  }, [open, name]);

  const clean = (name || '').trim();
  const matches = clean.length > 0 && typed.trim() === clean;

  const handleConfirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    try {
      const ok = await onConfirm();
      if (ok !== false) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Удалить сотрудника?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    Вы уверены, что хотите удалить сотрудника «<b className="text-slate-900">{name}</b>»?
                  </p>
                  <p className="text-xs text-slate-500">
                    {isEmployee
                      ? 'Профиль исчезнет из команды, но его продажи и остальная история сохранятся.'
                      : 'Имя исчезнет из списка «От имени».'}
                    {' '}Прошлые расходы останутся, но по этому имени больше не будут учитываться.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => setStep(2)}>
                <Trash2 className="w-4 h-4" /> Да, удалить
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Последний шаг
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Напишите имя сотрудника, чтобы подтвердить удаление.</p>
                  <p className="text-xs text-slate-500">
                    Введите точно так, как в списке: <b className="text-slate-900">{name}</b>
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Имя сотрудника
              </label>
              <Input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
                placeholder={name}
                className="mt-1.5 h-10 rounded-[11px] bg-slate-50"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={busy}>Назад</Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleConfirm}
                disabled={!matches || busy}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Удалить сотрудника
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}