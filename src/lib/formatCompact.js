/**
 * Форматирует число в компактном виде:
 *   >= 1 000 000 → "1.2M" (en) / "1.2 млн" (ru)
 *   >= 100 000   → "150K" (en) / "150 тыс." (ru)
 *   >= 10 000    → "15.5K" / "15.5 тыс."
 *   < 10 000     → полное число с разделителями
 */
export function formatCompact(value, lang = 'ru') {
  const abs = Math.abs(value);
  const isRu = lang === 'ru';
  const isTj = lang === 'tj';

  const suffixM = isRu ? 'млн' : isTj ? 'млн' : 'M';
  const suffixK = isRu ? 'тыс.' : isTj ? 'ҳаз.' : 'K';

  if (abs >= 1000000) {
    const v = value / 1000000;
    const formatted = v >= 100 ? Math.round(v) : trimZero(v.toFixed(1));
    return `${formatted}${suffixM}`;
  }
  if (abs >= 100000) {
    return `${Math.round(value / 1000)}${suffixK}`;
  }
  if (abs >= 10000) {
    const v = value / 1000;
    return `${trimZero(v.toFixed(1))}${suffixK}`;
  }
  return Math.round(value).toLocaleString('ru-RU');
}

function trimZero(s) {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}