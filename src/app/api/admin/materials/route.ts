import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { handle, parseJson } from '../../../../server/http';
import { requireStaff } from '../../../../server/auth';
import { audit } from '../../../../server/services/audit.service';
import { materialCreateSchema } from '../../../../server/validation/orders';
import type { MaterialSpool } from '../../../../types';

export const GET = handle(async () => {
  await requireStaff();
  const spools = await db.materialSpool.findMany({ orderBy: { id: 'asc' } });
  const dto: MaterialSpool[] = spools.map((s) => ({
    id: s.id,
    type: s.type as MaterialSpool['type'],
    brand: s.brand,
    colorName: s.colorName,
    colorHex: s.colorHex,
    diameterMm: s.diameterMm,
    totalWeightGrams: s.totalWeightGrams,
    remainingGrams: s.remainingGrams,
    purchaseCostGel: Number(s.purchaseCostGel),
    minThresholdGrams: s.minThresholdGrams,
    location: s.location,
  }));
  return NextResponse.json(dto);
});

/** Add a new spool / resin tank to the warehouse. */
export const POST = handle(async (req: Request) => {
  const actor = await requireStaff(['operator_prod']);
  const data = await parseJson(req, materialCreateSchema);
  const id = `spl-${crypto.randomBytes(5).toString('hex')}`;
  const remainingGrams = Math.min(data.remainingGrams ?? data.totalWeightGrams, data.totalWeightGrams);

  await db.$transaction(async (tx) => {
    await tx.materialSpool.create({ data: { id, ...data, remainingGrams } });
    await audit(tx, actor, {
      action: 'MATERIAL_ADDED',
      entityType: 'material',
      entityId: id,
      details: `Added ${data.type} ${data.brand} / ${data.colorName}, ${remainingGrams}g of ${data.totalWeightGrams}g`,
    });
  });
  return NextResponse.json({ id }, { status: 201 });
});
