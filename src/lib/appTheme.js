import { useEffect, useState } from 'react';
import { getActiveStyle, subscribeStyle } from './appStyles';

/**
 * Текущее оформление приложения (стиль + его палитра).
 * Перерисовывает компонент при смене стиля, поэтому цвета графиков,
 * карточек и меню сразу подстраиваются под выбранное пользователем оформление.
 */
export function useAppTheme() {
  const [style, setStyle] = useState(getActiveStyle);

  useEffect(() => subscribeStyle(setStyle), []);

  return {
    style,
    styleId: style.id,
    styleName: style.name,
    isDark: style.mode === 'dark',
    colors: style.colors,
  };
}

/**
 * Цвета терминальных элементов для текущего стиля.
 * accent — выручка/акцент, pos — прибыль, neg — убыток и долг.
 */
export function tkColors() {
  const c = getActiveStyle().colors;
  return {
    accent: c.accent,
    pos: c.pos,
    neg: c.neg,
    text: c.text,
    text2: c.text2,
    muted: c.muted,
    dim: c.dim,
    line: c.line,
    line2: c.line2,
    panel: c.panel,
    deep: c.deep,
    hover: c.deep2,
    onAccent: c.onAccent,
  };
}