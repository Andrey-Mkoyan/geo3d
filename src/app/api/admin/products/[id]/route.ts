import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { handle, parseJson, HttpError, notFound, badRequest } from '../../../../../server/http';
import { requireStaff } from '../../../../../server/auth';
import { audit } from '../../../../../server/services/audit.service';
import { toProductDTO } from '../../../../../server/dto';
import { fillLocales, productUpdateSchema } from '../../../../../server/validation/catalog';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const { id } = await ctx.params;
  const d = await parseJson(req, productUpdateSchema);
  if (!(await db.product.findUnique({ where: { id } }))) throw notFound('Product not found');
  if (d.category && !(await db.category.findUnique({ where: { id: d.category } }))) throw badRequest('Unknown category');
  if (d.slug) {
    const clash = await db.product.findUnique({ where: { slug: d.slug } });
    if (clash && clash.id !== id) throw new HttpError(409, 'A product with this slug already exists');
  }
  const { title, description, ...rest } = d;
  const updated = await db.$transaction(async (tx) => {
    const p = await tx.product.update({
      where: { id },
      data: { ...rest, ...(d.images ? { imageUrl: d.images[0] } : {}), ...(title ? { title: fillLocales(title) } : {}), ...(description ? { description: fillLocales(description) } : {}) },
    });
    await audit(tx, actor, { action: 'PRODUCT_UPDATED', entityType: 'product', entityId: id, details: `Updated fields: ${Object.keys(d).join(', ')}` });
    return p;
  });
  return NextResponse.json(toProductDTO(updated));
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const { id } = await ctx.params;
  const used = await db.orderItem.count({ where: { productId: id } });
  if (used > 0) {
    throw new HttpError(409, `This product is part of ${used} order item(s) and cannot be deleted. Hide it from the catalog instead.`, 'PRODUCT_IN_ORDERS');
  }
  await db.$transaction(async (tx) => {
    await tx.product.delete({ where: { id } });
    await audit(tx, actor, { action: 'PRODUCT_DELETED', entityType: 'product', entityId: id, details: `Deleted product ${id}` });
  });
  return NextResponse.json({ ok: true });
});
