import { NextResponse } from 'next/server';
import { clientIp, handle, notFound, parseJson } from '../../../../server/http';
import { rateLimit } from '../../../../server/ratelimit';
import { db } from '../../../../server/db';
import { makeTrackingToken } from '../../../../server/services/orders.service';
import { trackLookupSchema } from '../../../../server/validation/orders';

const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Lets a customer who lost the email/SMS find their order by order number + the phone used at checkout.
 * Returns the private tracking token. Strictly rate-limited; a mismatch is indistinguishable from "not found".
 */
export const POST = handle(async (req: Request) => {
  rateLimit(`lookup:${clientIp(req)}`, 8, 15 * 60_000);
  const { orderNumber, phone } = await parseJson(req, trackLookupSchema);
  rateLimit(`lookup-order:${orderNumber.toUpperCase()}`, 8, 15 * 60_000);

  const order = await db.order.findUnique({ where: { orderNumber: orderNumber.toUpperCase() } });
  const a = digits(phone);
  const b = order ? digits(order.customerPhone) : '';
  if (!order || a.length < 6 || !(a === b || b.endsWith(a) || a.endsWith(b))) throw notFound('Order not found');

  return NextResponse.json({ token: makeTrackingToken(order.id) });
});
