import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Building2, Phone, MapPin, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Проверяем, есть ли уже бизнес
      const businesses = await base44.entities.Business.filter({ owner_email: currentUser.email });
      if (businesses.length > 0) {
        navigate(createPageUrl('Dashboard'));
      }
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Business.create({
        ...formData,
        owner_email: user.email,
        is_active: true,
        default_color: 'Чёрный',
        default_size_from: 39,
        default_size_to: 44,
        default_pairs_per_box: 6,
        default_product_type: 'Туфли',
        language: 'ru'
      });

      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error creating business:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30 mb-4">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">ShoeWholesale</h1>
          <p className="text-slate-500 mt-2">Платформа управления оптовым бизнесом обуви</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Регистрация бизнеса</h2>
            <p className="text-slate-500 text-sm mt-1">Заполните информацию о вашем бизнесе</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-slate-700 font-medium">Название бизнеса *</Label>
              <div className="relative mt-1.5">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Оптовая база обуви"
                  className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-medium">Телефон</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+992 XXX XX XX XX"
                  className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-medium">Адрес</Label>
              <div className="relative mt-1.5">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Город, улица, дом"
                  className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.name}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/30"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Начать работу
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Добро пожаловать, {user?.full_name || user?.email}!
        </p>
      </div>
    </div>
  );
}