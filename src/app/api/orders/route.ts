import { NextResponse } from 'next/server';
import { clientIp, handle, parseJson } from '../../../server/http';
import { rateLimit } from '../../../server/ratelimit';
import { createOrder } from '../../../server/services/orders.service';
import { createOrderSchema } from '../../../server/validation/orders';

/** Public guest checkout: creates an order awaiting a bank transfer (or a staff quote). */
export const POST = handle(async (req: Request) => {
  rateLimit(`order:${clientIp(req)}`, 10, 60 * 60_000);
  const input = await parseJson(req, createOrderSchema);
  const result = await createOrder(input);
  return NextResponse.json(result, { status: 201 });
});
