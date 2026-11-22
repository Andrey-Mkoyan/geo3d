import { z } from 'zod';

const text3 = (max: number) =>
  z.object({
    en: z.string().trim().min(1).max(max),
    ka: z.string().trim().max(max).optional().default(''),
    ru: z.string().trim().max(max).optional().default(''),
  });

/** Missing translations fall back to English so the shop never shows an empty title. */
export const fillLocales = (v: { en: string; ka: string; ru: string }) => ({
  en: v.en,
  ka: v.ka || v.en,
  ru: v.ru || v.en,
});

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes');

export const categoryCreateSchema = z.object({
  id: slug,
  name: text3(80),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
});
export const categoryUpdateSchema = categoryCreateSchema.omit({ id: true }).partial();

const httpUrl = z
  .string()
  .trim()
  .max(1000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Must start with http:// or https://');

const imageRef = z
  .string()
  .trim()
  .max(1000)
  .refine((u) => u.startsWith('/') || /^https?:\/\//i.test(u), 'Use an uploaded image or an http(s) URL');

export const productBodySchema = z.object({
  slug: slug,
  title: text3(160),
  description: text3(4000),
  category: z.string().min(1).max(60),
  priceGel: z.number().min(0).max(100000),
  images: z.array(imageRef).min(1, 'Add at least one photo').max(12, 'Up to 12 photos'),
  dimensionsMm: z.object({ x: z.number().min(0).max(2000), y: z.number().min(0).max(2000), z: z.number().min(0).max(2000) }),
  weightGrams: z.number().int().min(0).max(100000),
  materials: z.array(z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Resin'])).min(1),
  leadTimeHours: z.number().int().min(0).max(5000),
  inStock: z.boolean(),
  published: z.boolean(),
  featured: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  modelUrl: httpUrl.nullable().optional(),
  presetModel: z.enum(['vase', 'stand', 'bracket', 'gear', 'dragon', 'tag']).nullable().optional(),
});
export const productCreateSchema = productBodySchema;
export const productUpdateSchema = productBodySchema.partial();
