import { NextResponse } from 'next/server';
import { handle, parseJson } from '../../../../../../server/http';
import { requireStaff } from '../../../../../../server/auth';
import { transitionStatus } from '../../../../../../server/services/orders.service';
import { adminStatusSchema } from '../../../../../../server/validation/orders';

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const { id } = await ctx.params;
  const { status, note } = await parseJson(req, adminStatusSchema);
  await transitionStatus(id, status, note, actor);
  return NextResponse.json({ ok: true });
});
