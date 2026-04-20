import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function CustomFieldsPanel({ business, onUpdate, lang }) {
  const [newColor, setNewColor] = useState('');
  const [newProductType, setNewProductType] = useState('');
  const [newPairsPerBox, setNewPairsPerBox] = useState('');
  const [editingColor, setEditingColor] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editColorDialog, setEditColorDialog] = useState(false);
  const [editTypeDialog, setEditTypeDialog] = useState(false);

  const save = async (data) => {
    await base44.entities.Business.update(business.id, data);
    const updated = await base44.entities.Business.filter({ id: business.id });
    if (updated[0]) onUpdate(updated[0]);
  };

  const handleAddPairsPerBox = async () => {
    const val = parseInt(newPairsPerBox);
    if (!val || val < 1) return;
    if ([4, 6, 8].includes(val)) { alert('Это значение уже есть в стандартных вариантах'); return; }
    const existing = business?.custom_pairs_per_box || [];
    if (existing.includes(val)) { alert('Это значение уже добавлено'); return; }
    await save({ custom_pairs_per_box: [...existing, val] });
    setNewPairsPerBox('');
  };

  return (
    <div className="space-y-4">
      {/* Custom Pairs Per Box */}
      <div className="p-4 bg-white rounded-lg border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-1">Варианты пар в коробке</h4>
        <p className="text-xs text-slate-400 mb-3">Стандартные: 4, 6, 8. Добавьте свои варианты (например: 9, 10, 12)</p>
        <div className="flex gap-2 mb-3">
          <Input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={newPairsPerBox}
            onChange={(e) => setNewPairsPerBox(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Например: 9" className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPairsPerBox()}
          />
          <Button onClick={handleAddPairsPerBox} disabled={!newPairsPerBox}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[4, 6, 8].map(v => (
            <div key={v} className="px-3 py-1 bg-slate-100 rounded-lg flex items-center gap-1.5">
              <span className="text-sm font-medium">{v} пар</span>
              <span className="text-xs text-slate-400">(стандарт)</span>
            </div>
          ))}
          {(business?.custom_pairs_per_box || []).map((val, i) => (
            <div key={i} className="px-3 py-1 bg-indigo-100 rounded-lg flex items-center gap-2">
              <span className="text-sm font-medium text-indigo-800">{val} пар</span>
              <button
                onClick={async () => {
                  const updated = (business.custom_pairs_per_box || []).filter((_, idx) => idx !== i);
                  await save({ custom_pairs_per_box: updated });
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="p-4 bg-white rounded-lg border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-3">Дополнительные цвета</h4>
        <div className="flex gap-2 mb-3">
          <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Например: Золотой" className="flex-1" />
          <Button onClick={async () => {
            if (newColor.trim()) {
              await save({ custom_colors: [...(business.custom_colors || []), newColor.trim()] });
              setNewColor('');
            }
          }}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(business?.custom_colors || []).map((color, i) => (
            <div key={i} className="px-3 py-1 bg-slate-100 rounded-lg flex items-center gap-2">
              <span className="text-sm">{color}</span>
              <button onClick={() => { setEditingColor({ index: i, value: color }); setEditColorDialog(true); }} className="text-blue-500 hover:text-blue-700"><Edit2 className="w-3 h-3" /></button>
              <button onClick={async () => {
                await save({ custom_colors: business.custom_colors.filter((_, idx) => idx !== i) });
              }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Product Types */}
      <div className="p-4 bg-white rounded-lg border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-3">Дополнительные типы товара</h4>
        <div className="flex gap-2 mb-3">
          <Input value={newProductType} onChange={(e) => setNewProductType(e.target.value)} placeholder="Например: Кроссовки" className="flex-1" />
          <Button onClick={async () => {
            if (newProductType.trim()) {
              await save({ custom_product_types: [...(business.custom_product_types || []), newProductType.trim()] });
              setNewProductType('');
            }
          }}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(business?.custom_product_types || []).map((type, i) => (
            <div key={i} className="px-3 py-1 bg-slate-100 rounded-lg flex items-center gap-2">
              <span className="text-sm">{type}</span>
              <button onClick={() => { setEditingType({ index: i, value: type }); setEditTypeDialog(true); }} className="text-blue-500 hover:text-blue-700"><Edit2 className="w-3 h-3" /></button>
              <button onClick={async () => {
                await save({ custom_product_types: business.custom_product_types.filter((_, idx) => idx !== i) });
              }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Color Dialog */}
      <Dialog open={editColorDialog} onOpenChange={setEditColorDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать цвет</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Название цвета</Label>
            <Input value={editingColor?.value || ''} onChange={(e) => setEditingColor({ ...editingColor, value: e.target.value })} className="mt-1.5" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditColorDialog(false)}>Отмена</Button>
            <Button onClick={async () => {
              if (editingColor?.value.trim()) {
                const updated = [...business.custom_colors];
                updated[editingColor.index] = editingColor.value.trim();
                await save({ custom_colors: updated });
                setEditColorDialog(false);
              }
            }}>Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Type Dialog */}
      <Dialog open={editTypeDialog} onOpenChange={setEditTypeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать тип товара</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Название типа</Label>
            <Input value={editingType?.value || ''} onChange={(e) => setEditingType({ ...editingType, value: e.target.value })} className="mt-1.5" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditTypeDialog(false)}>Отмена</Button>
            <Button onClick={async () => {
              if (editingType?.value.trim()) {
                const updated = [...business.custom_product_types];
                updated[editingType.index] = editingType.value.trim();
                await save({ custom_product_types: updated });
                setEditTypeDialog(false);
              }
            }}>Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}