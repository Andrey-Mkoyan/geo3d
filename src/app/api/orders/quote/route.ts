import { NextResponse } from 'next/server';
import { clientIp, handle, parseJson } from '../../../../server/http';
import { rateLimit } from '../../../../server/ratelimit';
import { computeQuote } from '../../../../server/services/pricing.service';
import { quoteSchema } from '../../../../server/validation/orders';

/** Recomputes totals on the server (promo + delivery) so the checkout UI never relies on client math. */
export const POST = handle(async (req: Request) => {
  rateLimit(`quote:${clientIp(req)}`, 60, 60_000);
  const input = await parseJson(req, quoteSchema);
  const q = await computeQuote(input);
  return NextResponse.json({
    subtotalGel: q.subtotalGel,
    deliveryGel: q.deliveryGel,
    discountGel: q.discountGel,
    totalGel: q.totalGel,
    promoCode: q.promoCode,
    requiresQuote: q.requiresQuote,
  });
});
