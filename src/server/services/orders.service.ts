import 'server-only';
import crypto from 'crypto';
import type { z } from 'zod';
import { db } from '../db';
import { HttpError, badRequest, notFound } from '../http';
import { computeQuote } from './pricing.service';
import { getSettings } from './settings.service';
import { audit, Actor, SYSTEM_CUSTOMER } from './audit.service';
import { notifyCustomer, NotifyTarget } from '../notify';
import { orderInclude } from '../dto';
import type { createOrderSchema } from '../validation/orders';
import type { OrderStatus } from '../../generated/prisma/enums';

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * The private tracking token is derived from the order id with a server secret (HMAC), so it is
 * unguessable, yet the server can rebuild the link for staff-triggered notifications.
 * Only its SHA-256 hash is stored for lookups.
 */
export function makeTrackingToken(orderId: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(`track:${orderId}`).digest('base64url');
}

export const trackingUrl = (token: string) =>
  `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/track/${token}`;

/** Statuses that mean "the workshop is working on it" — only allowed once payment is verified. */
const PRODUCTION: OrderStatus[] = [
  'confirmed',
  'preparation',
  'printing',
  'ready',
  'awaiting_courier',
  'shipped',
];

export function targetFor(o: {
  locale: 'ka' | 'en' | 'ru';
  preferredContact: 'EMAIL' | 'SMS';
  customerEmail: string;
  customerPhone: string;
  orderNumber: string;
}, token: string): NotifyTarget {
  return {
    locale: o.locale,
    preferredContact: o.preferredContact,
    email: o.customerEmail,
    phone: o.customerPhone,
    orderNumber: o.orderNumber,
    trackingUrl: trackingUrl(token),
  };
}

export async function createOrder(input: z.infer<typeof createOrderSchema>) {
  if (input.deliveryMethod !== 'self_pickup' && (!input.city || !input.deliveryAddress)) {
    throw badRequest('City and address are required for delivery');
  }
  const quote = await computeQuote(input, input.locale);
  const settings = await getSettings();

  const orderId = crypto.randomUUID();
  const token = makeTrackingToken(orderId);
  const leadHours = Math.max(36, ...quote.lines.map((l) => l.leadTimeHours));
  const actor = SYSTEM_CUSTOMER(input.customerName);

  const order = await db.$transaction(async (tx) => {
    if (quote.promoCode) {
      const updated = await tx.$executeRaw`
        UPDATE "PromoCode" SET "usedCount" = "usedCount" + 1
        WHERE "code" = ${quote.promoCode} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
      if (updated === 0) throw badRequest('Promo code is no longer available', 'BAD_PROMO');
    }

    const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
    const orderNumber = `GEO-${n}`;
    const paymentStatus = quote.requiresQuote ? 'awaiting_quote' : 'awaiting_payment';

    const created = await tx.order.create({
      data: {
        id: orderId,
        orderNumber,
        trackingTokenHash: hashToken(token),
        locale: input.locale,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail.toLowerCase(),
        preferredContact: input.preferredContact,
        deliveryMethod: input.deliveryMethod,
        city: input.deliveryMethod === 'self_pickup' ? 'Tbilisi' : input.city,
        deliveryAddress: input.deliveryMethod === 'self_pickup' ? settings.pickupAddress : input.deliveryAddress,
        subtotalGel: quote.subtotalGel,
        deliveryGel: quote.deliveryGel,
        discountGel: quote.discountGel,
        totalGel: quote.totalGel,
        promoCode: quote.promoCode,
        customerNotes: input.customerNotes,
        status: quote.requiresQuote ? 'awaiting_review' : 'awaiting_payment',
        paymentStatus,
        estimatedCompletion: new Date(Date.now() + leadHours * 3600 * 1000),
        items: {
          create: quote.lines.map((l) => ({
            type: l.type,
            productId: l.productId,
            modelRef: l.modelRef,
            title: l.title,
            subtitle: l.subtitle,
            imageUrl: l.imageUrl,
            material: l.config.material,
            colorName: l.config.colorName,
            colorHex: l.config.colorHex,
            layerHeight: l.config.layerHeight,
            infillPercent: l.config.infillPercent,
            scalePercent: l.config.scalePercent,
            quantity: l.config.quantity,
            options: {
              smoothVapor: l.config.smoothVapor ?? false,
              brassInserts: l.config.brassInserts ?? false,
              userNotes: l.config.userNotes ?? null,
            },
            geometry: l.geometry ?? undefined,
            unitPriceGel: l.unitPriceGel,
            totalPriceGel: l.totalPriceGel,
            requiresReview: l.requiresReview,
          })),
        },
        events: {
          create: {
            status: quote.requiresQuote ? 'awaiting_review' : 'awaiting_payment',
            paymentStatus,
            note: quote.requiresQuote
              ? 'Order received. Custom print: our team will review the model and confirm the final price.'
              : 'Order received. Waiting for your bank transfer and payment screenshot.',
            actorName: actor.name,
          },
        },
      },
    });

    await audit(tx, actor, {
      action: 'ORDER_CREATED',
      entityType: 'order',
      entityId: created.orderNumber,
      details: `New order with ${quote.lines.length} items. Total: ${quote.totalGel.toFixed(2)} GEL${quote.requiresQuote ? ' (needs quote)' : ''}`,
    });
    return created;
  });

  await notifyCustomer(targetFor(order, token), 'orderCreated');

  return {
    orderNumber: order.orderNumber,
    trackingToken: token,
    trackingUrl: trackingUrl(token),
    totalGel: quote.totalGel,
    paymentStatus: order.paymentStatus,
    requiresQuote: quote.requiresQuote,
    bankAccounts: quote.requiresQuote ? [] : settings.bankAccounts,
  };
}

export async function getOrderByToken(token: string) {
  const order = await db.order.findUnique({ where: { trackingTokenHash: hashToken(token) }, include: orderInclude });
  if (!order) throw notFound('Order not found');
  return order;
}

export async function transitionStatus(orderId: string, status: OrderStatus, note: string | undefined, actor: Actor) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Order not found');
  if (order.status === 'cancelled' && status !== 'cancelled') {
    throw new HttpError(409, 'Cancelled orders cannot be reopened');
  }
  if (PRODUCTION.includes(status) && order.paymentStatus !== 'verified') {
    throw new HttpError(409, 'Payment must be verified before production can start', 'PAYMENT_NOT_VERIFIED');
  }

  const eventNote = note?.trim() || `Status changed to ${status.replace(/_/g, ' ').toUpperCase()}`;
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status } });
    await tx.orderEvent.create({
      data: { orderId, status, note: eventNote, actorId: actor.id, actorName: actor.name },
    });
    await audit(tx, actor, {
      action: 'STATUS_ADVANCE',
      entityType: 'order',
      entityId: order.orderNumber,
      details: `Status ${order.status} -> ${status}. Note: ${note || 'None'}`,
    });
  });

  if (status === 'shipped') await notifyCustomerForOrder(order.id, 'shippedToCourier');
}

/** Admin sets/corrects the order total (e.g. the quote for custom prints). */
export async function adjustPrice(orderId: string, totalGel: number, actor: Actor) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Order not found');
  if (order.paymentStatus === 'verified' || order.paymentStatus === 'refunded') {
    throw new HttpError(409, 'The price cannot be changed after payment was verified');
  }
  if (order.status === 'cancelled') throw new HttpError(409, 'Order is cancelled');

  const wasQuote = order.paymentStatus === 'awaiting_quote';
  const total = Math.round(totalGel * 100) / 100;
  const subtotal = Math.max(0, Math.round((total - Number(order.deliveryGel) + Number(order.discountGel)) * 100) / 100);

  await db.$transaction(async (tx) => {
    // A screenshot for the old amount no longer counts
    const stale = await tx.paymentProof.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'STALE' } });
    await tx.order.update({
      where: { id: orderId },
      data: {
        totalGel: total,
        subtotalGel: subtotal,
        paymentStatus: 'awaiting_payment',
        status: order.status === 'awaiting_review' ? 'awaiting_payment' : order.status,
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        paymentStatus: 'awaiting_payment',
        status: order.status === 'awaiting_review' ? 'awaiting_payment' : order.status,
        note: wasQuote
          ? `Final price confirmed: ${total.toFixed(2)} GEL. Please pay by bank transfer and upload the screenshot.`
          : `Price updated to ${total.toFixed(2)} GEL.${stale.count ? ' Previous payment screenshot is no longer valid.' : ''}`,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    await audit(tx, actor, {
      action: 'PRICE_CORRECTION',
      entityType: 'price',
      entityId: order.orderNumber,
      details: `Price ${Number(order.totalGel).toFixed(2)} -> ${total.toFixed(2)} GEL`,
    });
  });

  await notifyCustomerForOrder(orderId, 'quoteReady', { total: total.toFixed(2) });
}

export async function updateOrderMeta(
  orderId: string,
  data: { internalNotes?: string; assignedPrinterId?: string | null },
  actor: Actor
) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Order not found');
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data });
    await audit(tx, actor, {
      action: 'ORDER_UPDATED',
      entityType: 'order',
      entityId: order.orderNumber,
      details: `Updated: ${Object.keys(data).join(', ')}`,
    });
  });
}

/** Staff-triggered notification: rebuilds the customer's private link from the order id. */
export async function notifyCustomerForOrder(
  orderId: string,
  key: Parameters<typeof notifyCustomer>[1],
  vars: Record<string, string> = {}
) {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o) return;
  await notifyCustomer(targetFor(o, makeTrackingToken(o.id)), key, vars);
}
