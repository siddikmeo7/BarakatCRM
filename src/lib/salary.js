// Salary calculation methods for employees.
// Each method computes earned salary given a set of sales stats for a period.

export const SALARY_METHODS = [
  {
    key: 'per_box',
    label: 'За коробку',
    icon: '📦',
    rateLabel: 'Ставка за коробку (с.)',
    ratePlaceholder: 'напр. 50',
    description: 'Зарплата = количество проданных коробок × ставка. Чем больше коробок продал сотрудник — тем больше заработал. Простой и понятный метод для оптовой торговли.',
  },
  {
    key: 'per_pair',
    label: 'За пару',
    icon: '👟',
    rateLabel: 'Ставка за пару (с.)',
    ratePlaceholder: 'напр. 10',
    description: 'Зарплата = количество проданных пар × ставка. Учитывает пары внутри коробок (коробка = несколько пар). Подходит, когда важно поощрять продажу по парам, а не целыми коробками.',
  },
  {
    key: 'fixed_monthly',
    label: 'Фикс. месячная',
    icon: '📅',
    rateLabel: 'Оклад в месяц (с.)',
    ratePlaceholder: 'напр. 3000',
    description: 'Фиксированный месячный оклад независимо от объёма продаж. Сотрудник получает стабильную сумму каждый месяц. Дополнительно можно учитывать продажи при необходимости.',
  },
  {
    key: 'percent_revenue',
    label: '% от выручки',
    icon: '📊',
    rateLabel: 'Процент от выручки (%)',
    ratePlaceholder: 'напр. 5',
    description: 'Зарплата = выручка × процент. Сотрудник получает процент от суммы всех продаж. Мотивирует продавать дороже и больше. Например, 5% от 100 000 с. = 5 000 с.',
  },
];

export function getSalaryMethod(key) {
  return SALARY_METHODS.find(m => m.key === key) || SALARY_METHODS[0];
}

// Compute salary for one employee given their aggregated sales + method settings.
// stats: { boxes, pairs, salesCount, revenue }
// employee: { salary_method, salary_rate, salary_per_box }
export function computeSalary(stats, employee) {
  const method = employee.salary_method || 'per_box';
  const rate = Number(employee.salary_rate || 0);
  const perBox = Number(employee.salary_per_box || 0);

  switch (method) {
    case 'per_pair':
      return (stats.pairs || 0) * rate;
    case 'fixed_monthly':
      return rate; // fixed monthly amount (proration by period handled by caller if needed)
    case 'percent_revenue':
      return (stats.revenue || 0) * (rate / 100);
    case 'per_box':
    default:
      // backward-compat: use salary_per_box
      return (stats.boxes || 0) * (perBox || rate);
  }
}