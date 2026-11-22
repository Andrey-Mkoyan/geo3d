import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { handle, notFound, parseJson } from '../../../../../server/http';
import { requireStaff } from '../../../../../server/auth';
import { orderInclude, toOrderDTO } from '../../../../../server/dto';
import { updateOrderMeta } from '../../../../../server/services/orders.service';
import { adminOrderPatchSchema } from '../../../../../server/validation/orders';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireStaff();
  const { id } = await ctx.params;
  const order = await db.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw notFound('Order not found');
  return NextResponse.json(toOrderDTO(order, { staff: true }));
});

/** Internal notes / assigned printer. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const { id } = await ctx.params;
  await updateOrderMeta(id, await parseJson(req, adminOrderPatchSchema), actor);
  return NextResponse.json({ ok: true });
});
