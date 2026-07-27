// Login streak tracker - stores daily login dates in localStorage

const getKey = (email) => `login_dates_${email}`;

export function recordLogin(email) {
  if (!email) return;
  const key = getKey(email);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  try {
    const dates = JSON.parse(localStorage.getItem(key) || '[]');
    if (!dates.includes(today)) {
      dates.push(today);
      // Keep only last 365 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);
      const filtered = dates.filter(d => new Date(d) >= cutoff);
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
  const todayStr = today.toISOString().split('T')[0];
  if (!dateSet.has(todayStr)) {
    today.setDate(today.getDate() - 1);
  }
  // Count consecutive days backwards
  while (true) {
    const dateStr = today.toISOString().split('T')[0];
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
    const dateStr = d.toISOString().split('T')[0];
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