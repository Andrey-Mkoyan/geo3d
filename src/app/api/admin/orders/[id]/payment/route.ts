import { NextResponse } from 'next/server';
import { handle, parseJson } from '../../../../../../server/http';
import { requireStaff } from '../../../../../../server/auth';
import { approvePayment, rejectPayment } from '../../../../../../server/services/payments.service';
import { adminPaymentSchema } from '../../../../../../server/validation/orders';

/** Approve or reject the latest payment screenshot. Body: {action:'approve'} | {action:'reject', reason} */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireStaff(['operator_orders']);
  const { id } = await ctx.params;
  const body = await parseJson(req, adminPaymentSchema);
  if (body.action === 'approve') await approvePayment(id, actor);
  else await rejectPayment(id, body.reason, actor);
  return NextResponse.json({ ok: true });
});
