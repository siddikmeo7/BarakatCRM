import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Building2, Users, Copy, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function BusinessAccess() {
  const [step, setStep] = useState('main'); // main, manage
  const [email, setEmail] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [business, setBusiness] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setEmail(currentUser.email);

      // Загружаем бизнес владельца
      const businesses = await base44.entities.Business.filter({ owner_email: currentUser.email });
      if (businesses.length > 0) {
        setBusiness(businesses[0]);
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const handleJoinWithAccessCode = async () => {
    if (!accessCode.trim()) {
      setError('Введите код доступа');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const businesses = await base44.entities.Business.filter({ access_code: accessCode });
      if (businesses.length === 0) {
        setError('Неверный код доступа');
        setLoading(false);
        return;
      }

      const business = businesses[0];
      const employees = await base44.entities.Employee.filter({ 
        business_id: business.id, 
        user_email: user.email 
      });

      if (employees.length === 0) {
        setError('Вы не сотрудник этого бизнеса');
        setLoading(false);
        return;
      }

      navigate(createPageUrl('Dashboard'));
    } catch (err) {
      setError('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBusiness = async () => {
    if (!businessName.trim()) {
      setError('Введите название бизнеса');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const codesRes = await base44.functions.invoke('generateBusinessCodes', {});
      const { businessCode: bCode, accessCode: aCode } = codesRes.data;

      const newBiz = await base44.entities.Business.create({
        name: businessName,
        owner_email: email,
        business_code: bCode,
        access_code: aCode,
        is_active: true,
        default_color: 'Чёрный',
        default_size_from: 39,
        default_size_to: 44,
        default_pairs_per_box: 6,
        default_product_type: 'Туфли',
        language: 'ru'
      });

      setBusiness(newBiz);
      alert(`✅ Бизнес создан!\n\nКод бизнеса: ${bCode}\nКод доступа: ${aCode}`);
      setBusinessName('');
      setStep('main');
    } catch (err) {
      setError('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async (type) => {
    setLoading(true);
    try {
      const codesRes = await base44.functions.invoke('generateBusinessCodes', {});
      const { businessCode: bCode, accessCode: aCode } = codesRes.data;

      const updateData = type === 'business' 
        ? { business_code: bCode }
        : { access_code: aCode };

      await base44.entities.Business.update(business.id, updateData);
      
      const updated = await base44.entities.Business.filter({ id: business.id });
      if (updated.length > 0) setBusiness(updated[0]);
      alert(`✅ ${type === 'business' ? 'Код бизнеса' : 'Код доступа'} обновлён`);
    } catch (err) {
      setError('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        {step === 'main' && (
          <div className="p-8">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">BarakatCRM</h1>
              <p className="text-slate-500 mt-2">Управление бизнесом</p>
            </div>

            {business ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Ваш бизнес</p>
                  <p className="text-lg font-bold text-slate-900">{business.name}</p>
                </div>

                <Button
                  onClick={() => navigate(createPageUrl('Dashboard'))}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-10"
                >
                  Войти в бизнес
                </Button>

                <Button
                  onClick={() => setStep('manage')}
                  variant="outline"
                  className="w-full h-10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Управлять кодами доступа
                </Button>

                <button
                  onClick={() => base44.auth.logout()}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium py-2"
                >
                  Выход
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={() => setStep('join')}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Войти как сотрудник
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-300"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">или</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Название вашего бизнеса</label>
                  <Input
                    placeholder="Мой магазин"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}

                <Button
                  onClick={handleCreateBusiness}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-10"
                >
                  {loading ? 'Создание...' : 'Создать новый бизнес'}
                </Button>

                <button
                  onClick={() => base44.auth.logout()}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium py-2"
                >
                  Выход
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'join' && (
          <div className="p-8">
            <button
              onClick={() => setStep('main')}
              className="flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Войти как сотрудник</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Код доступа</label>
                <Input
                  placeholder="Введите код доступа"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}

              <Button
                onClick={handleJoinWithAccessCode}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-10"
              >
                {loading ? 'Вход...' : 'Войти'}
              </Button>

              <button
                onClick={() => base44.auth.logout()}
                className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium py-2"
              >
                Выход
              </button>
            </div>
          </div>
        )}

        {step === 'manage' && business && (
          <div className="p-8">
            <button
              onClick={() => setStep('main')}
              className="flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Коды доступа</h2>

            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-600 font-medium mb-2">КОД БИЗНЕСА (поделитесь с сотрудниками)</p>
                <div className="flex items-center gap-2 mb-2">
                  <code className="flex-1 bg-white border border-slate-200 p-2 rounded font-mono font-bold text-slate-900 break-all">
                    {business.business_code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(business.business_code)}
                    className="p-2 hover:bg-slate-200 rounded transition"
                  >
                    <Copy className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <Button
                  onClick={() => handleRegenerateCode('business')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Изменить код
                </Button>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-600 font-medium mb-2">КОД ДОСТУПА (для входа в бизнес)</p>
                <div className="flex items-center gap-2 mb-2">
                  <code className="flex-1 bg-white border border-slate-200 p-2 rounded font-mono font-bold text-slate-900 break-all">
                    {business.access_code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(business.access_code)}
                    className="p-2 hover:bg-slate-200 rounded transition"
                  >
                    <Copy className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <Button
                  onClick={() => handleRegenerateCode('access')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Изменить код
                </Button>
              </div>

              {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-2">📝 Как сотруднику войти в бизнес:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Перейти на страницу входа</li>
                  <li>Нажать "Войти в бизнес"</li>
                  <li>Ввести свой email</li>
                  <li>Ввести код бизнеса и код доступа</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}