import type { Language, PrintMaterialType, Product, StockOption } from '../types';

/** Known colours with localized names. Falls back to the colour name staff typed on the spool. */
export const KNOWN_COLOR_NAMES: { name: Record<Language, string>; hex: string }[] = [
  { name: { ka: 'მქრქალი შავი', en: 'Matte Charcoal Black', ru: 'Матовый черный' }, hex: '#1e1e20' },
  { name: { ka: 'სპილენძის აბრეშუმი', en: 'Silk Terracotta Copper', ru: 'Шелковая медь' }, hex: '#c86432' },
  { name: { ka: 'ინჟინრული ნაცრისფერი', en: 'Slate Industrial Grey', ru: 'Индустриальный серый' }, hex: '#52565e' },
  { name: { ka: 'სუფთა თეთრი', en: 'Signal White', ru: 'Сигнальный белый' }, hex: '#f4f4f5' },
  { name: { ka: 'უსაფრთხოების ნარინჯისფერი', en: 'Safety Orange', ru: 'Яркий оранжевый' }, hex: '#ea580c' },
  { name: { ka: 'მუქი ლურჯი', en: 'Midnight Blue', ru: 'Глубокий синий' }, hex: '#1e3a8a' },
  { name: { ka: 'ზურმუხტისფერი', en: 'Emerald Green', ru: 'Изумрудный' }, hex: '#15803d' },
];

/** Materials that are currently in stock, optionally limited to those a product supports. */
export function materialsInStock(stock: StockOption[], allowed?: PrintMaterialType[]): PrintMaterialType[] {
  const inStock = new Set(stock.map((s) => s.type));
  const order: PrintMaterialType[] = allowed ?? ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Resin'];
  return order.filter((m) => inStock.has(m));
}

export function colorsInStock(stock: StockOption[], material: PrintMaterialType | undefined): StockOption[] {
  return material ? stock.filter((s) => s.type === material) : [];
}

/** Localized colour name: product's own naming first, then the known list, then the spool's name. */
export function colorLabel(opt: StockOption, language: Language, product?: Product | null): string {
  const hex = opt.hex.toLowerCase();
  const fromProduct = product?.availableColors.find((c) => c.hex.toLowerCase() === hex);
  if (fromProduct) return fromProduct.name[language];
  const known = KNOWN_COLOR_NAMES.find((c) => c.hex.toLowerCase() === hex);
  return known ? known.name[language] : opt.name;
}

/**
 * Default option for quick "add to cart": first stocked material the product supports + its first colour.
 * null = the product cannot be made right now (nothing in stock for it).
 */
export function defaultOptionFor(stock: StockOption[], product: Product): { material: PrintMaterialType; color: StockOption } | null {
  const material = materialsInStock(stock, product.materials)[0];
  const color = colorsInStock(stock, material)[0];
  return material && color ? { material, color } : null;
}

export const stockText: Record<Language, { outOfStock: string; noMaterial: string; lowStock: string }> = {
  en: {
    outOfStock: 'Out of stock',
    noMaterial: 'No material in stock for this item right now. Please check back soon.',
    lowStock: 'Low stock',
  },
  ka: {
    outOfStock: 'არ არის მარაგში',
    noMaterial: 'ამ ნივთისთვის მასალა ამჟამად მარაგში არ არის. სცადეთ მოგვიანებით.',
    lowStock: 'მცირე მარაგი',
  },
  ru: {
    outOfStock: 'Нет в наличии',
    noMaterial: 'Материала для этого изделия сейчас нет в наличии. Загляните позже.',
    lowStock: 'Мало на складе',
  },
};
