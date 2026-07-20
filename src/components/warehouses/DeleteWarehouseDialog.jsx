import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, AlertCircle, Loader2, Package, ChevronRight, ChevronLeft } from 'lucide-react';

const HIGH_STOCK_THRESHOLD = 50; // boxes
const MANY_PRODUCTS_THRESHOLD = 5;

export default function DeleteWarehouseDialog({ warehouse, stats, onConfirm, onClose, deleting }) {
  const [step, setStep] = useState(1);
  const [typedName, setTypedName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  if (!warehouse) return null;

  const hasProducts = stats.productsCount > 0;
  const isHighStock = stats.totalBoxes >= HIGH_STOCK_THRESHOLD;
  const hasManyProducts = stats.productsCount >= MANY_PRODUCTS_THRESHOLD;
  const nameMatches = typedName.trim() === warehouse.name.trim();

  const handleClose = () => {
    setStep(1);
    setTypedName('');
    setAcknowledged(false);
    onClose();
  };

  return (
    <Dialog open={!!warehouse} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Удаление склада
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-red-500' : 'bg-slate-200'}`} />
          ))}
        </div>
        <p className="text-xs text-slate-400 text-center mb-3">Шаг {step} из 3</p>

        {/* Step 1: Warning */}
        {step === 1 && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 border-2 ${isHighStock || hasManyProducts ? 'border-red-400 bg-red-50 animate-pulse-border' : 'border-amber-300 bg-amber-50'}`}>
              <div className="flex items-start gap-2">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isHighStock ? 'text-red-600' : 'text-amber-500'}`} />
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isHighStock ? 'text-red-700' : 'text-amber-800'}`}>
                    {isHighStock ? '⚠️ Очень много товаров!' : 'Внимание!'}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Склад <strong>«{warehouse.name}»</strong> содержит:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white/70 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-slate-800">{stats.productsCount}</p>
                      <p className="text-[10px] text-slate-500">товаров</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-purple-600">{stats.totalBoxes}</p>
                      <p className="text-[10px] text-slate-500">коробок</p>
                    </div>
                  </div>
                  {hasProducts && (
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      📦 Все товары на этом складе станут «без склада» и потребуют перемещения!
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">Это действие:</p>
              <p>• Безвозвратно удалит склад «{warehouse.name}»</p>
              <p>• Товары останутся в системе, но потеряют привязку к складу</p>
              <p>• История продаж сохранится</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button
                onClick={() => setStep(2)}
                className={`gap-2 text-white ${isHighStock ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                Продолжить
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Type warehouse name */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-sm text-slate-700">
                Для подтверждения введите название склада:
              </p>
              <p className="text-lg font-bold text-red-600 mt-1">«{warehouse.name}»</p>
            </div>

            <div>
              <Input
                autoFocus
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Введите точное название склада..."
                className={`text-center font-medium ${typedName && !nameMatches ? 'border-red-300' : nameMatches ? 'border-emerald-400 bg-emerald-50' : ''}`}
                onKeyDown={(e) => { if (e.key === 'Enter' && nameMatches) setStep(3); }}
              />
              {typedName && !nameMatches && (
                <p className="text-xs text-red-500 mt-1 text-center">Название не совпадает</p>
              )}
              {nameMatches && (
                <p className="text-xs text-emerald-600 mt-1 text-center">✓ Название совпадает</p>
              )}
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Назад
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!nameMatches}
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                Продолжить
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Final confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <p className="text-base font-bold text-red-700">Финальное подтверждение</p>
              <p className="text-sm text-slate-600 mt-1">
                Вы действительно хотите удалить склад <strong>«{warehouse.name}»</strong>?
              </p>
              {hasProducts && (
                <p className="text-xs text-amber-600 mt-2">
                  После удаления {stats.productsCount} товаров останутся без склада.
                </p>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer p-3 bg-red-50 rounded-xl border border-red-200">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-red-600"
              />
              <span className="text-xs text-red-700 font-medium">
                Да, я понимаю что это действие необратимо. Я подтверждаю удаление склада «{warehouse.name}» и всех связанных данных.
              </span>
            </label>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Назад
              </Button>
              <Button
                onClick={onConfirm}
                disabled={!acknowledged || deleting}
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Удалить склад навсегда
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}