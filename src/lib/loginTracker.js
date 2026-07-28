// Login streak tracker - stores daily login dates in localStorage
// Uses LOCAL date (not UTC) to match user's timezone

const getKey = (email) => `login_dates_${email}`;

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function recordLogin(email) {
  if (!email) return;
  const key = getKey(email);
  const today = getLocalDateStr();
  try {
    const dates = JSON.parse(localStorage.getItem(key) || '[]');
    if (!dates.includes(today)) {
      dates.push(today);
      // Keep only last 365 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);
      const cutoffStr = getLocalDateStr(cutoff);
      const filtered = dates.filter(d => d >= cutoffStr);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch (_) {}
}

export function getLoginDates(email) {
  if (!email) return [];
  try {
    return JSON.parse(localStorage.getItem(getKey(email)) || '[]');
  } catch (_) {
    return [];
  }
}

export function computeStreak(email) {
  const dates = getLoginDates(email);
  if (dates.length === 0) return 0;
  const dateSet = new Set(dates);
  let streak = 0;
  const today = new Date();
  // If today not logged in but yesterday was, streak still counts from yesterday
  const todayStr = getLocalDateStr(today);
  if (!dateSet.has(todayStr)) {
    today.setDate(today.getDate() - 1);
  }
  // Count consecutive days backwards
  while (true) {
    const dateStr = getLocalDateStr(today);
    if (dateSet.has(dateStr)) {
      streak++;
      today.setDate(today.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getActivityCalendar(email, days = 30) {
  const dates = getLoginDates(email);
  const dateSet = new Set(dates);
  const calendar = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateStr(d);
    calendar.push({
      date: dateStr,
      day: d.getDate(),
      weekday: d.toLocaleDateString('ru', { weekday: 'short' }),
      month: d.toLocaleDateString('ru', { month: 'short' }),
      loggedIn: dateSet.has(dateStr),
    });
  }
  return calendar;
}

export function getTotalLoginDays(email) {
  return getLoginDates(email).length;
}