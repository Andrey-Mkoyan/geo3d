import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { handle, parseJson, HttpError, notFound } from '../../../../../server/http';
import { requireStaff } from '../../../../../server/auth';
import { audit } from '../../../../../server/services/audit.service';
import { categoryUpdateSchema, fillLocales } from '../../../../../server/validation/catalog';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const { id } = await ctx.params;
  const data = await parseJson(req, categoryUpdateSchema);
  if (!(await db.category.findUnique({ where: { id } }))) throw notFound('Category not found');
  await db.$transaction(async (tx) => {
    await tx.category.update({
      where: { id },
      data: {
        ...(data.name ? { name: fillLocales(data.name) } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
    await audit(tx, actor, { action: 'CATEGORY_UPDATED', entityType: 'category', entityId: id, details: JSON.stringify(data).slice(0, 300) });
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const { id } = await ctx.params;
  const count = await db.product.count({ where: { category: id } });
  if (count > 0) {
    throw new HttpError(409, `This category still has ${count} product(s). Move or delete them first.`, 'CATEGORY_NOT_EMPTY');
  }
  await db.$transaction(async (tx) => {
    await tx.category.delete({ where: { id } });
    await audit(tx, actor, { action: 'CATEGORY_DELETED', entityType: 'category', entityId: id, details: `Deleted category ${id}` });
  });
  return NextResponse.json({ ok: true });
});
