import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { handle, notFound, parseJson } from '../../../../../server/http';
import { requireStaff } from '../../../../../server/auth';
import { audit } from '../../../../../server/services/audit.service';
import { materialPatchSchema } from '../../../../../server/validation/orders';

type Ctx = { params: Promise<{ id: string }> };

/** Set the remaining grams (print deduction, refill, manual correction). */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requireStaff(['operator_prod']);
  const { id } = await ctx.params;
  const { remainingGrams } = await parseJson(req, materialPatchSchema);
  const spool = await db.materialSpool.findUnique({ where: { id } });
  if (!spool) throw notFound('Spool not found');

  await db.$transaction(async (tx) => {
    await tx.materialSpool.update({ where: { id }, data: { remainingGrams } });
    await audit(tx, actor, {
      action: 'MATERIAL_ADJUST',
      entityType: 'material',
      entityId: id,
      details: `${spool.type} ${spool.colorName}: remaining ${spool.remainingGrams}g -> ${remainingGrams}g`,
    });
  });
  return NextResponse.json({ ok: true });
});

/** Remove a spool from the warehouse (e.g. empty / written off). */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const actor = await requireStaff(['operator_prod']);
  const { id } = await ctx.params;
  const spool = await db.materialSpool.findUnique({ where: { id } });
  if (!spool) throw notFound('Spool not found');

  await db.$transaction(async (tx) => {
    await tx.materialSpool.delete({ where: { id } });
    await audit(tx, actor, {
      action: 'MATERIAL_REMOVED',
      entityType: 'material',
      entityId: id,
      details: `Removed ${spool.type} ${spool.brand} / ${spool.colorName} (${spool.remainingGrams}g left)`,
    });
  });
  return NextResponse.json({ ok: true });
});
