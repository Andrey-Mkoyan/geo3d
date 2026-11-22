import 'server-only';
import type { Prisma } from '../../generated/prisma/client';
import { db } from '../db';
import { estimateGramsPerUnit } from '../../lib/pricing';
import { audit, Actor } from './audit.service';
import type { PrintMaterialType, StockOption } from '../../types';

/**
 * What customers may order right now: every material + colour that has filament left in the warehouse
 * (grams are summed over all spools of the same material and colour).
 */
export async function getStockOptions(): Promise<StockOption[]> {
  const spools = await db.materialSpool.findMany({ where: { remainingGrams: { gt: 0 } }, orderBy: { remainingGrams: 'desc' } });
  const map = new Map<string, StockOption>();
  for (const s of spools) {
    const key = `${s.type}|${s.colorHex.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) existing.availableGrams += s.remainingGrams;
    else map.set(key, { type: s.type as PrintMaterialType, hex: s.colorHex.toLowerCase(), name: s.colorName, availableGrams: s.remainingGrams });
  }
  return [...map.values()];
}

/**
 * Called inside the payment-approval transaction.
 * Deducts the filament/resin an order needs from the matching warehouse spools
 * (same material + same colour). Never blocks the approval: if there is not enough stock the
 * spools are emptied and a MATERIAL_SHORTAGE audit entry tells the workshop what to reorder.
 *
 * Grams per unit:
 *  - catalog product: Product.weightGrams
 *  - custom print:    estimated from the model volume, infill and scale (same formula as pricing)
 */
export async function consumeStockForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  orderNumber: string,
  actor: Actor
) {
  const items = await tx.orderItem.findMany({ where: { orderId }, include: { product: true } });

  // Total grams needed per (material, colour)
  const need = new Map<string, { type: string; hex: string; colorName: string; grams: number }>();
  for (const item of items) {
    let perUnit = 0;
    if (item.type === 'catalog_product') {
      perUnit = item.product?.weightGrams ?? 0;
    } else {
      const volume = (item.geometry as { volumeCm3?: number } | null)?.volumeCm3 ?? 0;
      perUnit = volume > 0 ? estimateGramsPerUnit(volume, item.material as PrintMaterialType, item.infillPercent, item.scalePercent) : 0;
    }
    const grams = Math.round(perUnit * item.quantity);
    if (grams <= 0) continue;

    const key = `${item.material}|${item.colorHex.toLowerCase()}`;
    const entry = need.get(key) ?? { type: item.material, hex: item.colorHex.toLowerCase(), colorName: item.colorName, grams: 0 };
    entry.grams += grams;
    need.set(key, entry);
  }

  for (const { type, hex, colorName, grams } of need.values()) {
    // Lock the matching spools so two simultaneous approvals cannot double-spend the same filament
    const spools = await tx.$queryRaw<{ id: string; remainingGrams: number; brand: string }[]>`
      SELECT "id", "remainingGrams", "brand" FROM "MaterialSpool"
      WHERE "type" = ${type} AND lower("colorHex") = ${hex}
      ORDER BY "remainingGrams" DESC
      FOR UPDATE`;

    let left = grams;
    for (const spool of spools) {
      if (left <= 0) break;
      const take = Math.min(spool.remainingGrams, left);
      if (take <= 0) continue;
      await tx.materialSpool.update({ where: { id: spool.id }, data: { remainingGrams: spool.remainingGrams - take } });
      left -= take;
      await audit(tx, actor, {
        action: 'MATERIAL_CONSUMED',
        entityType: 'material',
        entityId: spool.id,
        details: `Order ${orderNumber}: -${take}g ${type} ${colorName} (${spool.brand}), ${spool.remainingGrams}g -> ${spool.remainingGrams - take}g`,
      });
    }

    if (left > 0) {
      await audit(tx, actor, {
        action: 'MATERIAL_SHORTAGE',
        entityType: 'material',
        entityId: orderNumber,
        details:
          spools.length === 0
            ? `Order ${orderNumber}: needs ${grams}g of ${type} ${colorName} but no such spool exists in the warehouse. Add it under Materials.`
            : `Order ${orderNumber}: needs ${grams}g of ${type} ${colorName}, ${left}g short. Spools are now empty: reorder.`,
      });
    }
  }
}
