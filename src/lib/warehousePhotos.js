// Фотографии «Витрины складов»: статичные снимки для шапки раздела и карточек складов.
// Карточки берут снимок по порядку склада, поэтому витрина выглядит одинаково при каждом входе.

export const WAREHOUSE_HERO =
  'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/4f09644c0_generated_2d33e04c.jpg';

const WAREHOUSE_PHOTOS = [
  'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/bf0372d70_generated_64f6970e.jpg',
  'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/2e032578c_generated_f12b3787.jpg',
  'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/c1fac45e6_generated_046d121f.jpg',
  'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/43c492a40_generated_8b0039fa.jpg',
];

// Снимок склада по его порядковому номеру в списке
export function warehousePhoto(index) {
  const i = Number.isFinite(index) && index >= 0 ? index : 0;
  return WAREHOUSE_PHOTOS[i % WAREHOUSE_PHOTOS.length];
}