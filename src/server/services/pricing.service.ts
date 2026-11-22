import 'server-only';
import { db } from '../db';
import { badRequest } from '../http';
import { calculatePrintPrice } from '../../lib/pricing';
import { getSettings } from './settings.service';
import { getStockOptions } from './inventory.service';
import type { z } from 'zod';
import type { quoteSchema } from '../validation/orders';

type QuoteInput = z.infer<typeof quoteSchema>;
type Locale = 'ka' | 'en' | 'ru';

export interface PricedLine {
  type: 'catalog_product' | 'custom_file';
  productId: string | null;
  modelRef: string | null;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  config: QuoteInput['items'][number]['config'];
  geometry: QuoteInput['items'][number]['geometry'] | null;
  unitPriceGel: number;
  totalPriceGel: number;
  requiresReview: boolean;
  leadTimeHours: number;
}

export interface Quote {
  lines: PricedLine[];
  subtotalGel: number;
  deliveryGel: number;
  discountGel: number;
  totalGel: number;
  promoCode: string | null;
  requiresQuote: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Authoritative server-side totals. NEVER trusts prices from the client:
 *  - catalog items are priced from the DB,
 *  - delivery fees come from settings,
 *  - promo codes are validated against the DB,
 *  - custom prints are priced with the shared formula but ALWAYS require staff review,
 *    because the model volume is client-supplied and the file itself is not uploaded.
 */
export async function computeQuote(input: QuoteInput, locale: Locale = 'ka'): Promise<Quote> {
  const ids = [...new Set(input.items.filter((i) => i.type === 'catalog_product').map((i) => i.productId))];
  if (ids.some((id) => !id)) throw badRequest('Catalog item without productId');
  const products = await db.product.findMany({ where: { id: { in: ids as string[] } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Only materials/colours that are physically in the warehouse can be ordered
  const stock = await getStockOptions();
  const inStock = (material: string, hex: string) =>
    stock.some((s) => s.type === material && s.hex === hex.toLowerCase());

  const lines: PricedLine[] = input.items.map((item) => {
    const { config } = item;
    if (item.type === 'catalog_product') {
      const p = byId.get(item.productId!);
      if (!p || !p.published) throw badRequest('Product no longer exists', 'PRODUCT_NOT_FOUND');
      if (!p.inStock) throw badRequest(`"${(p.title as Record<string, string>)[locale]}" is out of stock`, 'OUT_OF_STOCK');
      if (!p.materials.includes(config.material)) throw badRequest('Material not available for this product');
      if (!inStock(config.material, config.colorHex)) {
        throw badRequest(`${config.material} ${config.colorName} is out of stock`, 'MATERIAL_OUT_OF_STOCK');
      }
      const unit = Number(p.priceGel);
      return {
        type: 'catalog_product',
        productId: p.id,
        modelRef: p.modelUrl,
        title: (p.title as Record<string, string>)[locale] ?? item.title,
        subtitle: item.subtitle,
        imageUrl: p.imageUrl,
        config,
        geometry: null,
        unitPriceGel: unit,
        totalPriceGel: round1(unit * config.quantity),
        requiresReview: false,
        leadTimeHours: p.leadTimeHours,
      };
    }

    if (!item.geometry) throw badRequest('Custom print requires model details');
    if (!inStock(config.material, config.colorHex)) {
      throw badRequest(`${config.material} ${config.colorName} is out of stock`, 'MATERIAL_OUT_OF_STOCK');
    }
    const price = calculatePrintPrice(
      item.geometry.volumeCm3,
      config.material,
      config.layerHeight,
      config.infillPercent,
      config.scalePercent,
      config.quantity,
      !!config.smoothVapor,
      !!config.brassInserts
    );
    return {
      type: 'custom_file',
      productId: null,
      modelRef: item.modelRef ?? null,
      title: item.title,
      subtitle: item.subtitle,
      imageUrl: null,
      config,
      geometry: item.geometry,
      unitPriceGel: round1(price.total / config.quantity),
      totalPriceGel: price.total,
      requiresReview: true,
      leadTimeHours: Math.ceil(price.estimatedHours) + 12,
    };
  });

  const settings = await getSettings();
  const subtotalGel = round1(lines.reduce((s, l) => s + l.totalPriceGel, 0));
  const deliveryGel = settings.deliveryFees[input.deliveryMethod];

  let discountGel = 0;
  let promoCode: string | null = null;
  if (input.promoCode?.trim()) {
    const code = input.promoCode.trim().toUpperCase();
    const promo = await db.promoCode.findUnique({ where: { code } });
    const valid =
      promo &&
      promo.active &&
      (!promo.validUntil || promo.validUntil > new Date()) &&
      (promo.maxUses == null || promo.usedCount < promo.maxUses);
    if (!valid) throw badRequest('Invalid or expired promo code', 'BAD_PROMO');
    promoCode = promo.code;
    discountGel = round1(subtotalGel * (promo.percentOff / 100));
  }

  return {
    lines,
    subtotalGel,
    deliveryGel,
    discountGel,
    totalGel: Math.max(0, round1(subtotalGel - discountGel + deliveryGel)),
    promoCode,
    requiresQuote: lines.some((l) => l.requiresReview),
  };
}
