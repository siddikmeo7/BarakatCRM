import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

// Логотип и название компании — единый экран загрузки для всех разделов
const LOGO_URL = 'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/462578192_logo.png';

/**
 * Экран загрузки BarakatCRM: логотип по центру экрана, название компании
 * и плавная анимация появления — одинаковая для всех страниц.
 * Дополнительно следит за временем загрузки:
 *  — 12–14с: «Загрузка занимает чуть больше времени, подождите…»
 *  — 15с+: «Загрузка затянулась» + кнопка перезагрузки
 * Также поддерживает firstTime — сообщение для первого входа.
 */
export default function BrandedLoader({ message = 'Загрузка...', fullScreen = false, firstTime = false, timed = true }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const slow = elapsed >= 12 && elapsed < 15;
  const stuck = elapsed >= 15;

  return (
    <div className={`bl-screen ${fullScreen ? '' : 'inset'}`}>
      <div className="bl-lockup">
        {/* Логотип по центру */}
        <div className="bl-mark">
          <span className="bl-glow" />
          <div className="bl-plate">
            <img src={LOGO_URL} alt="BarakatCRM" />
          </div>
        </div>

        {/* Название компании */}
        <p className="bl-name">BarakatCRM</p>
        <p className="bl-msg">{message}</p>

        {/* Бегущая полоса загрузки — ускоряется, если загрузка затянулась */}
        <div className="bl-track">
          <span className="bl-run" style={{ animationDuration: stuck ? '0.9s' : '1.9s' }} />
        </div>

        {timed && firstTime && !slow && !stuck && (
          <p className="bl-note">Вы впервые вошли — нужно немного времени, чтобы загрузить данные. Пожалуйста, подождите 🙏</p>
        )}

        {timed && slow && (
          <p className="bl-note warn">Загрузка занимает чуть больше времени, чем обычно. Пожалуйста, подождите — скоро всё откроется ⏳</p>
        )}

        {timed && stuck && (
          <div className="bl-stuck">
            <p className="bl-note err">Похоже, загрузка затянулась. Проверьте соединение или обновите страницу.</p>
            <button onClick={() => window.location.reload()} className="bl-btn">
              <RefreshCw className="w-3.5 h-3.5" /> Обновить страницу
            </button>
          </div>
        )}

        {timed && elapsed > 3 && <p className="bl-elapsed">{elapsed} сек</p>}
      </div>
    </div>
  );
}