import 'server-only';
import type { z } from 'zod';
import { db } from '../db';
import { HttpError, notFound } from '../http';
import { processPaymentScreenshot, randomKey } from '../image';
import { getStorage } from '../storage';
import { audit, Actor, SYSTEM_CUSTOMER } from './audit.service';
import { getOrderByToken, notifyCustomerForOrder } from './orders.service';
import { notifyStaffProofSubmitted } from '../notify';
import { consumeStockForOrder } from './inventory.service';
import type { proofMetaSchema } from '../validation/orders';

const MAX_PROOFS_PER_ORDER = 10;

/** Customer uploads a payment screenshot using their private tracking token. */
export async function submitProof(token: string, file: Buffer, meta: z.infer<typeof proofMetaSchema>) {
  const order = await getOrderByToken(token);

  if (order.status === 'cancelled') throw new HttpError(409, 'This order was cancelled');
  if (order.paymentStatus === 'awaiting_quote') {
    throw new HttpError(409, 'The final price is not confirmed yet. We will notify you when you can pay.', 'AWAITING_QUOTE');
  }
  if (order.paymentStatus === 'verified' || order.paymentStatus === 'refunded') {
    throw new HttpError(409, 'Payment for this order is already verified');
  }
  if (order.proofs.length >= MAX_PROOFS_PER_ORDER) {
    throw new HttpError(429, 'Too many uploads for this order. Please contact us.');
  }

  const img = await processPaymentScreenshot(file);

  const duplicate = await db.paymentProof.findFirst({
    where: { sha256: img.sha256, orderId: { not: order.id } },
    include: { order: { select: { orderNumber: true } } },
  });

  const storage = getStorage();
  const fileKey = randomKey('payment-proofs');
  const thumbKey = randomKey('payment-proofs/thumbs');
  await storage.put(fileKey, img.full, 'image/webp');
  await storage.put(thumbKey, img.thumb, 'image/webp');

  const actor = SYSTEM_CUSTOMER(order.customerName);
  try {
    await db.$transaction(async (tx) => {
      // Older unreviewed screenshots are superseded by the new one
      await tx.paymentProof.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'STALE' } });
      await tx.paymentProof.create({
        data: {
          orderId: order.id,
          fileKey,
          thumbKey,
          mimeType: 'image/webp',
          sizeBytes: img.sizeBytes,
          sha256: img.sha256,
          amountClaimedGel: meta.amountClaimedGel,
          payerName: meta.payerName,
          bankName: meta.bankName,
          transferDate: meta.transferDate,
        },
      });
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'proof_submitted' } });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          paymentStatus: 'proof_submitted',
          status: order.status,
          note: 'Payment screenshot received. Our team will verify your payment shortly.',
          actorName: actor.name,
        },
      });
      await audit(tx, actor, {
        action: 'PAYMENT_PROOF_UPLOADED',
        entityType: 'order',
        entityId: order.orderNumber,
        details: duplicate
          ? `Screenshot uploaded. WARNING: identical image was already used on order ${duplicate.order.orderNumber}.`
          : 'Payment screenshot uploaded.',
      });
    });
  } catch (err) {
    await Promise.allSettled([storage.delete(fileKey), storage.delete(thumbKey)]);
    throw err;
  }

  await notifyStaffProofSubmitted(order.orderNumber);
  return { paymentStatus: 'proof_submitted' as const };
}

async function loadForReview(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { proofs: { where: { status: 'PENDING' }, orderBy: { uploadedAt: 'desc' } } },
  });
  if (!order) throw notFound('Order not found');
  if (order.paymentStatus !== 'proof_submitted' || order.proofs.length === 0) {
    throw new HttpError(409, 'There is no payment screenshot waiting for review');
  }
  return { order, proof: order.proofs[0] };
}

export async function approvePayment(orderId: string, actor: Actor) {
  const { order, proof } = await loadForReview(orderId);
  await db.$transaction(async (tx) => {
    await tx.paymentProof.update({
      where: { id: proof.id },
      data: { status: 'APPROVED', reviewedById: actor.id, reviewedAt: new Date() },
    });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'verified', status: 'confirmed' } });
    await tx.orderEvent.create({
      data: {
        orderId,
        status: 'confirmed',
        paymentStatus: 'verified',
        note: 'Payment verified. Your order is confirmed and goes into production.',
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    // Payment verified -> the material for this order is now committed: deduct it from the warehouse
    await consumeStockForOrder(tx, orderId, order.orderNumber, actor);
    await audit(tx, actor, {
      action: 'PAYMENT_APPROVED',
      entityType: 'order',
      entityId: order.orderNumber,
      details: `Payment verified for ${Number(order.totalGel).toFixed(2)} GEL`,
    });
  });
  await notifyCustomerForOrder(orderId, 'paymentApproved');
}

export async function rejectPayment(orderId: string, reason: string, actor: Actor) {
  const { order, proof } = await loadForReview(orderId);
  await db.$transaction(async (tx) => {
    await tx.paymentProof.update({
      where: { id: proof.id },
      data: { status: 'REJECTED', rejectReason: reason, reviewedById: actor.id, reviewedAt: new Date() },
    });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'rejected' } });
    await tx.orderEvent.create({
      data: {
        orderId,
        paymentStatus: 'rejected',
        status: order.status,
        note: `Payment screenshot not accepted: ${reason}. Please upload a new one.`,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    await audit(tx, actor, {
      action: 'PAYMENT_REJECTED',
      entityType: 'order',
      entityId: order.orderNumber,
      details: `Screenshot rejected: ${reason}`,
    });
  });
  await notifyCustomerForOrder(orderId, 'paymentRejected', { reason });
}
