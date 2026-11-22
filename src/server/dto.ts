import 'server-only';
import type { Prisma } from '../generated/prisma/client';
import type { CartItem, Order, PaymentProofInfo, Product } from '../types';

export const orderInclude = {
  items: true,
  events: { orderBy: { createdAt: 'asc' } },
  proofs: { orderBy: { uploadedAt: 'desc' }, include: { reviewedBy: { select: { name: true } } } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : Number(d));

function toCartItem(i: OrderWithRelations['items'][number], staff: boolean): CartItem {
  const opts = (i.options ?? {}) as { smoothVapor?: boolean; brassInserts?: boolean; userNotes?: string };
  return {
    cartItemId: i.id,
    type: i.type,
    productId: i.productId ?? undefined,
    title: i.title,
    subtitle: i.subtitle,
    imageUrl: i.imageUrl ?? undefined,
    geometry: (i.geometry as unknown as CartItem['geometry']) ?? undefined,
    config: {
      material: i.material as CartItem['config']['material'],
      colorName: i.colorName,
      colorHex: i.colorHex,
      layerHeight: i.layerHeight as CartItem['config']['layerHeight'],
      infillPercent: i.infillPercent,
      scalePercent: i.scalePercent,
      quantity: i.quantity,
      ...opts,
    },
    unitPriceGel: num(i.unitPriceGel),
    totalPriceGel: num(i.totalPriceGel),
    requiresReview: i.requiresReview,
    ...(staff && i.modelRef ? { modelRef: i.modelRef } : {}),
  };
}

/**
 * Maps a DB order to the `Order` shape the UI already uses.
 * `staff: true` adds internal notes, operator names and authenticated screenshot URLs.
 * The public (tracking) view never includes those.
 */
export function toOrderDTO(o: OrderWithRelations, opts: { staff: boolean }): Order {
  const proofs: PaymentProofInfo[] = o.proofs.map((p) => ({
    id: p.id,
    status: p.status,
    uploadedAt: p.uploadedAt.toISOString(),
    reviewedAt: p.reviewedAt?.toISOString(),
    rejectReason: p.rejectReason ?? undefined,
    ...(opts.staff
      ? {
          reviewedBy: p.reviewedBy?.name,
          amountClaimedGel: p.amountClaimedGel == null ? undefined : num(p.amountClaimedGel),
          payerName: p.payerName ?? undefined,
          bankName: p.bankName ?? undefined,
          transferDate: p.transferDate?.toISOString(),
          imageUrl: `/api/admin/files/${p.id}`,
          thumbUrl: `/api/admin/files/${p.id}?thumb=1`,
        }
      : {}),
  }));

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    deliveryMethod: o.deliveryMethod,
    deliveryAddress: o.deliveryAddress,
    city: o.city,
    paymentStatus: o.paymentStatus,
    paymentProofs: proofs,
    items: o.items.map((i) => toCartItem(i, opts.staff)),
    subtotalGel: num(o.subtotalGel),
    deliveryGel: num(o.deliveryGel),
    discountGel: num(o.discountGel),
    totalGel: num(o.totalGel),
    status: o.status,
    assignedPrinterId: o.assignedPrinterId ?? undefined,
    estimatedCompletion: (o.estimatedCompletion ?? o.createdAt).toISOString(),
    timeline: o.events.map((e) => ({
      status: (e.status ?? o.status) as Order['status'],
      timestamp: e.createdAt.toISOString(),
      note: e.note,
      ...(opts.staff && e.actorName ? { operatorName: e.actorName } : {}),
    })),
    ...(opts.staff ? { internalNotes: o.internalNotes ?? undefined } : {}),
  };
}

export function toProductDTO(p: Prisma.ProductGetPayload<object>): Product {
  return {
    id: p.id,
    title: p.title as unknown as Product['title'],
    description: p.description as unknown as Product['description'],
    category: p.category,
    priceGel: num(p.priceGel),
    imageUrl: p.images[0] ?? p.imageUrl,
    images: p.images.length ? p.images : [p.imageUrl],
    dimensionsMm: p.dimensionsMm as unknown as Product['dimensionsMm'],
    weightGrams: p.weightGrams,
    materials: p.materials as Product['materials'],
    availableColors: p.colors as unknown as Product['availableColors'],
    leadTimeHours: p.leadTimeHours,
    inStock: p.inStock,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    featured: p.featured,
    tags: p.tags,
    slug: p.slug,
    modelUrl: p.modelUrl ?? undefined,
    published: p.published,
    presetModelType: (p.presetModel as Product['presetModelType']) ?? undefined,
  };
}
