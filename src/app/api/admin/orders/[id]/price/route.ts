import { NextResponse } from 'next/server';
import { handle, parseJson } from '../../../../../../server/http';
import { requireStaff } from '../../../../../../server/auth';
import { adjustPrice } from '../../../../../../server/services/orders.service';
import { adminPriceSchema } from '../../../../../../server/validation/orders';

/** Set the final price (quote for custom prints, or a correction before payment). */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireStaff(['operator_orders']);
  const { id } = await ctx.params;
  const { totalGel } = await parseJson(req, adminPriceSchema);
  await adjustPrice(id, totalGel, actor);
  return NextResponse.json({ ok: true });
});
