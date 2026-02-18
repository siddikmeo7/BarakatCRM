import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/components/permissions/permissionsHelper';

export default function RoleManager({ businessId, lang, t }) {
  const [roles, setRoles] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {},
  });

  useEffect(() => {
    loadRoles();
  }, [businessId]);

  const loadRoles = async () => {
    try {
      const data = await base44.entities.Role.filter({ business_id: businessId });
      setRoles(data);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializePermissions = () => {
    const perms = {};
    Object.values(PERMISSIONS).forEach(perm => {
      perms[perm] = false;
    });
    return perms;
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: initializePermissions(),
    });
    setShowDialog(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || initializePermissions(),
    });
    setShowDialog(true);
  };

  const handleSaveRole = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingRole) {
        await base44.entities.Role.update(editingRole.id, {
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
        });
      } else {
        await base44.entities.Role.create({
          business_id: businessId,
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
        });
      }
      setShowDialog(false);
      loadRoles();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Удалить эту роль?')) return;
    try {
      await base44.entities.Role.delete(roleId);
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const togglePermission = (permKey) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permKey]: !formData.permissions[permKey],
      },
    });
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Управление ролями</h3>
        <Button onClick={handleCreateRole} className="gap-2">
          <Plus className="w-4 h-4" />
          Новая роль
        </Button>
      </div>

      <div className="grid gap-3">
        {roles.map(role => (
          <Card key={role.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-white">{role.name}</h4>
                {role.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{role.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(role.permissions || {}).map(([key, value]) => 
                    value && (
                      <span key={key} className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded">
                        {key}
                      </span>
                    )
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditRole(role)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteRole(role.id)}
                  className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Редактировать роль' : 'Создать роль'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Название роли</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Менеджер по продажам"
              />
            </div>

            <div>
              <Label>Описание</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание роли"
              />
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Права доступа</Label>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Аналитика</p>
                  <div className="space-y-2 ml-4">
                    {['view_analytics', 'view_profit'].map(perm => (
                      <div key={perm} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.permissions[perm] || false}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <label className="text-sm text-slate-600 dark:text-slate-400">{perm}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Товары</p>
                  <div className="space-y-2 ml-4">
                    {['view_products', 'add_products', 'edit_products', 'delete_products'].map(perm => (
                      <div key={perm} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.permissions[perm] || false}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <label className="text-sm text-slate-600 dark:text-slate-400">{perm}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Продажи</p>
                  <div className="space-y-2 ml-4">
                    {['view_sales', 'add_sales', 'edit_sales', 'cancel_sales'].map(perm => (
                      <div key={perm} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.permissions[perm] || false}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <label className="text-sm text-slate-600 dark:text-slate-400">{perm}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Управление</p>
                  <div className="space-y-2 ml-4">
                    {['view_warehouses', 'manage_warehouses', 'view_customers', 'manage_customers', 'view_debts', 'manage_debts', 'manage_returns', 'view_activity_log', 'manage_employees', 'manage_roles'].map(perm => (
                      <div key={perm} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.permissions[perm] || false}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <label className="text-sm text-slate-600 dark:text-slate-400">{perm}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveRole} className="bg-indigo-600 hover:bg-indigo-700">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}