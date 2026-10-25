import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Building2, Users, Copy, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ensureManagerRole } from '@/lib/defaultRoles';
import { TRIAL_DAYS } from '@/lib/subscription';

export default function BusinessAccess() {
  const [step, setStep] = useState('main'); // main, manage, join, employee
  const [email, setEmail] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [business, setBusiness] = useState(null);
  const [user, setUser] = useState(null);
  const [employeeRecords, setEmployeeRecords] = useState([]);
  const [employeeBusinesses, setEmployeeBusinesses] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setEmail(currentUser.email);

      // Use backend function to bypass RLS
      const res = await base44.functions.invoke('getEmployeeBusinesses', {});
      const data = res.data || {};

      if (data.ownedBusinesses && data.ownedBusinesses.length > 0) {
        setBusiness(data.ownedBusinesses[0]);
      }

      const empRecords = data.employees || [];
      setEmployeeRecords(empRecords);
      setEmployeeBusinesses(data.businesses || {});
    } catch (err) {
      console.error('Error loading user:', err);
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
        language: 'ru',
        // Бесплатный первый месяц: доступ открыт TRIAL_DAYS дней с момента создания бизнеса
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      });

      setBusiness(newBiz);
      // Создаём роль «Менеджер» по умолчанию для нового бизнеса
      await ensureManagerRole(newBiz.id);
      alert(`✅ Бизнес создан!\n\nКод бизнеса: ${bCode}\nКод доступа: ${aCode}\n\nСейчас мы перезагрузим приложение, чтобы загрузить ваш новый бизнес.`);
      // Перезагружаем, чтобы Layout подхватил новый бизнес и инициализировал доступ
      window.location.href = '/';
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

  const handleJoinBusiness = async () => {
    if (!businessCode.trim() || !accessCode.trim()) {
      setError('Введите код бизнеса и код доступа');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('joinBusinessByCodes', {
        businessCode: businessCode.trim(),
        accessCode: accessCode.trim()
      });

      if (!res.data?.success) {
        setError('❌ ' + (res.data?.error || 'Ошибка входа'));
        setLoading(false);
        return;
      }

      // Устанавливаем режим сотрудника и перезагружаем
      localStorage.setItem('barakatcrm_mode', `employee_${res.data.employee_id}`);
      sessionStorage.setItem('barakatcrm_mode', `employee_${res.data.employee_id}`);
      window.location.href = '/';
    } catch (err) {
      console.error('Join business error:', err);
      const msg = err?.response?.data?.error || err?.message || 'неизвестная ошибка';
      setError('❌ ' + msg);
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
                  onClick={() => { localStorage.removeItem('barakatcrm_mode'); sessionStorage.removeItem('barakatcrm_mode'); window.location.href = '/'; }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-10"
                >
                  Войти как владелец
                </Button>

                <Button
                  onClick={() => setStep('manage')}
                  variant="outline"
                  className="w-full h-10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Управлять кодами доступа
                </Button>

                {/* Если пользователь также является сотрудником в других бизнесах */}
                {employeeRecords.length > 0 && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-slate-500">Вы также сотрудник</span>
                      </div>
                    </div>
                    {employeeRecords.map(emp => {
                      const empBiz = employeeBusinesses[emp.id];
                      return (
                        <Button
                          key={emp.id}
                          onClick={() => { localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`); sessionStorage.setItem('barakatcrm_mode', `employee_${emp.id}`); window.location.href = '/'; }}
                          variant="outline"
                          className="w-full h-10 border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Войти как сотрудник{empBiz ? `: ${empBiz.name}` : ''}
                        </Button>
                      );
                    })}
                  </>
                )}

                {employeeRecords.length === 0 && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-slate-500">или</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setStep('join')}
                      variant="outline"
                      className="w-full h-10 border-indigo-300 text-indigo-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Войти как сотрудник другого бизнеса
                    </Button>
                  </>
                )}

                <button
                  onClick={() => base44.auth.logout()}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium py-2"
                >
                  Выход
                </button>
              </div>
            ) : employeeRecords.length > 0 ? (
              // Пользователь является сотрудником — показываем только кнопки входа как сотрудник
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  <p className="font-medium mb-1">✅ Вы добавлены как сотрудник</p>
                  <p>Выберите бизнес для входа:</p>
                </div>

                {employeeRecords.map(emp => {
                  const empBiz = employeeBusinesses[emp.id];
                  if (emp.is_frozen) return null;
                  return (
                    <Button
                      key={emp.id}
                      onClick={() => { localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`); sessionStorage.setItem('barakatcrm_mode', `employee_${emp.id}`); window.location.href = '/'; }}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {empBiz ? empBiz.name : 'Войти как сотрудник'}
                    </Button>
                  );
                })}

                <div className="relative pt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-400">или</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep('create')}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-1"
                >
                  + Создать свой бизнес
                </button>

                <button
                  onClick={() => base44.auth.logout()}
                  className="w-full text-sm text-slate-400 hover:text-slate-600 font-medium py-1"
                >
                  Выход
                </button>
              </div>
            ) : (
              <div className="space-y-4">
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">или</span>
                  </div>
                </div>

                <Button
                  onClick={() => setStep('join')}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Войти как сотрудник
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

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Вход как сотрудник</h2>
            <p className="text-sm text-slate-500 mb-6">Введите коды доступа, которые дал владелец бизнеса</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Код бизнеса</label>
                <Input
                  placeholder="Например: 123456789012"
                  value={businessCode}
                  onChange={(e) => setBusinessCode(e.target.value)}
                  className="font-mono"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoinBusiness(); }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Код доступа</label>
                <Input
                  placeholder="Код доступа от владельца"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="font-mono"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoinBusiness(); }}
                />
              </div>

              {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm border border-red-300">{error}</div>}

              <Button
                onClick={handleJoinBusiness}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-10"
              >
                {loading ? 'Вход...' : 'Войти как сотрудник'}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Ваш email: {email}
              </p>
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
                  <li>Нажать "Войти как сотрудник"</li>
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