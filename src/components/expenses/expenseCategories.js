import {
  Home, Users, Truck, Zap, Megaphone, UtensilsCrossed, ShoppingBasket,
  Heart, GraduationCap, Landmark, ScrollText, MoreHorizontal,
} from 'lucide-react';

// Категории расходов: значок, подпись и цвета.
// soft — мягкая подложка (кружок значка и фон карточки),
// tone — цвет значка, bar — цвет полосы и дуги диаграммы.
export const CATEGORIES = [
  { value: 'Аренда', label: 'Аренда', icon: Home, soft: '#fbeccb', tone: '#b9852a', bar: '#e8b04a' },
  { value: 'Зарплата', label: 'Зарплата', icon: Users, soft: '#e0efe5', tone: '#2f6b57', bar: '#2f6b57' },
  { value: 'Транспорт', label: 'Транспорт', icon: Truck, soft: '#e3e8f6', tone: '#5c70b8', bar: '#7a8fd6' },
  { value: 'Коммунальные', label: 'Коммунальные', icon: Zap, soft: '#fbeccb', tone: '#b9852a', bar: '#e8b04a' },
  { value: 'Реклама', label: 'Реклама', icon: Megaphone, soft: '#f1e2f1', tone: '#a05ca0', bar: '#a05ca0' },
  { value: 'Еда', label: 'Еда', icon: UtensilsCrossed, soft: '#fbe3df', tone: '#e2574c', bar: '#e2574c' },
  { value: 'На дом', label: 'На дом', icon: ShoppingBasket, soft: '#e0efe5', tone: '#2f6b57', bar: '#2f6b57' },
  { value: 'Личные', label: 'Личные', icon: Heart, soft: '#e3e8f6', tone: '#5c70b8', bar: '#7a8fd6' },
  { value: 'Обучение', label: 'Обучение', icon: GraduationCap, soft: '#f1e2f1', tone: '#a05ca0', bar: '#a05ca0' },
  { value: 'Налог', label: 'Налог', icon: Landmark, soft: '#fbeccb', tone: '#b9852a', bar: '#e8b04a' },
  { value: 'Патент', label: 'Патент', icon: ScrollText, soft: '#e0efe5', tone: '#2f6b57', bar: '#2f6b57' },
  { value: 'Прочее', label: 'Прочее', icon: MoreHorizontal, soft: '#e3e8f6', tone: '#5c70b8', bar: '#7a8fd6' },
];

export const getCategoryInfo = (cat) =>
  CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];