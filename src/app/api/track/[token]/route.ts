import { NextResponse } from 'next/server';
import { clientIp, handle } from '../../../../server/http';
import { rateLimit } from '../../../../server/ratelimit';
import { getOrderByToken } from '../../../../server/services/orders.service';
import { getSettings } from '../../../../server/services/settings.service';
import { toOrderDTO } from '../../../../server/dto';

/** Customer view of their own order, authorized by the private token in the URL. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  rateLimit(`track:${clientIp(req)}`, 60, 60_000);
  const { token } = await ctx.params;
  const order = await getOrderByToken(token);
  const settings = await getSettings();
  return NextResponse.json(
    {
      order: toOrderDTO(order, { staff: false }),
      // Bank details are only shown while a payment is actually expected
      bankAccounts: ['awaiting_payment', 'rejected', 'proof_submitted'].includes(order.paymentStatus)
        ? settings.bankAccounts
        : [],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
