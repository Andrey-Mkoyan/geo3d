import { z } from 'zod';

const materials = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Resin'] as const;

const itemConfig = z.object({
  material: z.enum(materials),
  colorName: z.string().max(60),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  layerHeight: z.union([z.literal(0.12), z.literal(0.16), z.literal(0.2), z.literal(0.28)]).default(0.16),
  infillPercent: z.number().int().min(5).max(100).default(25),
  scalePercent: z.number().int().min(10).max(500).default(100),
  quantity: z.number().int().min(1).max(500),
  smoothVapor: z.boolean().optional(),
  brassInserts: z.boolean().optional(),
  userNotes: z.string().max(1000).optional(),
});

export const cartItemSchema = z.object({
  type: z.enum(['catalog_product', 'custom_file']),
  productId: z.string().optional(),
  title: z.string().max(200),
  subtitle: z.string().max(300).default(''),
  config: itemConfig,
  // Untrusted client-side file metadata (only used for custom prints, always re-reviewed by staff)
  geometry: z
    .object({
      fileName: z.string().max(200),
      volumeCm3: z.number().nonnegative().max(1_000_000),
      triangles: z.number().int().nonnegative().optional(),
      bounds: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      isSample: z.boolean().optional(),
    })
    .optional(),
  modelRef: z.string().max(500).optional(),
});

export const quoteSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  deliveryMethod: z.enum(['tbilisi_courier', 'regional_courier', 'self_pickup']),
  promoCode: z.string().max(40).optional(),
});

export const createOrderSchema = quoteSchema.extend({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(6).max(30),
  customerEmail: z.string().trim().email().max(200),
  preferredContact: z.enum(['EMAIL', 'SMS']).default('EMAIL'),
  locale: z.enum(['ka', 'en', 'ru']).default('ka'),
  city: z.string().trim().max(100).default(''),
  deliveryAddress: z.string().trim().max(300).default(''),
  customerNotes: z.string().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

export const adminStatusSchema = z.object({
  status: z.enum([
    'awaiting_payment',
    'awaiting_review',
    'confirmed',
    'preparation',
    'printing',
    'ready',
    'awaiting_courier',
    'shipped',
    'cancelled',
  ]),
  note: z.string().max(500).optional(),
});

export const adminPriceSchema = z.object({
  totalGel: z.number().positive().max(1_000_000),
});

export const adminPaymentSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().min(3).max(500) }),
]);

export const adminOrderPatchSchema = z.object({
  internalNotes: z.string().max(2000).optional(),
  assignedPrinterId: z.string().nullable().optional(),
});

export const proofMetaSchema = z.object({
  amountClaimedGel: z.coerce.number().positive().max(1_000_000).optional(),
  payerName: z.string().max(120).optional(),
  bankName: z.string().max(60).optional(),
  transferDate: z.coerce.date().optional(),
});

export const trackLookupSchema = z.object({
  orderNumber: z.string().trim().min(3).max(20),
  phone: z.string().trim().min(6).max(30),
});

export const materialPatchSchema = z.object({ remainingGrams: z.number().int().min(0).max(100000) });

export const materialCreateSchema = z.object({
  type: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Resin']),
  brand: z.string().trim().min(1).max(80),
  colorName: z.string().trim().min(1).max(60),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  diameterMm: z.number().positive().max(5).default(1.75),
  totalWeightGrams: z.number().int().min(50).max(20000),
  remainingGrams: z.number().int().min(0).max(20000).optional(),
  purchaseCostGel: z.number().min(0).max(100000),
  minThresholdGrams: z.number().int().min(0).max(20000).default(200),
  location: z.string().trim().max(60).default(''),
});
