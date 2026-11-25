import {
  Home, Users, Truck, Zap, Megaphone, UtensilsCrossed, ShoppingBasket,
  Heart, GraduationCap, Landmark, ScrollText, MoreHorizontal,
} from 'lucide-react';

// Категории расходов: значок, подпись и цвета — используются и в форме,
// и в карточке, и в списке, и в чеке (деталях) расхода.
export const CATEGORIES = [
  { value: 'Аренда', label: 'Аренда', icon: Home, color: 'bg-blue-100 text-blue-600', bar: '#4f46e5' },
  { value: 'Зарплата', label: 'Зарплата', icon: Users, color: 'bg-green-100 text-green-600', bar: '#16a34a' },
  { value: 'Транспорт', label: 'Транспорт', icon: Truck, color: 'bg-orange-100 text-orange-600', bar: '#ea580c' },
  { value: 'Коммунальные', label: 'Коммунальные', icon: Zap, color: 'bg-yellow-100 text-yellow-600', bar: '#ca8a04' },
  { value: 'Реклама', label: 'Реклама', icon: Megaphone, color: 'bg-purple-100 text-purple-600', bar: '#9333ea' },
  { value: 'Еда', label: 'Еда', icon: UtensilsCrossed, color: 'bg-rose-100 text-rose-600', bar: '#06b6d4' },
  { value: 'На дом', label: 'На дом', icon: ShoppingBasket, color: 'bg-amber-100 text-amber-600', bar: '#d97706' },
  { value: 'Личные', label: 'Личные', icon: Heart, color: 'bg-pink-100 text-pink-600', bar: '#db2777' },
  { value: 'Обучение', label: 'Обучение', icon: GraduationCap, color: 'bg-violet-100 text-violet-600', bar: '#7c3aed' },
  { value: 'Налог', label: 'Налог', icon: Landmark, color: 'bg-cyan-100 text-cyan-600', bar: '#0891b2' },
  { value: 'Патент', label: 'Патент', icon: ScrollText, color: 'bg-teal-100 text-teal-600', bar: '#0d9488' },
  { value: 'Прочее', label: 'Прочее', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600', bar: '#64748b' },
];

export const getCategoryInfo = (cat) =>
  CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];