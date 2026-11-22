import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { handle, parseJson, HttpError } from '../../../../server/http';
import { requireStaff } from '../../../../server/auth';
import { audit } from '../../../../server/services/audit.service';
import { categoryCreateSchema, fillLocales } from '../../../../server/validation/catalog';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireStaff();
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(
    cats.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, active: c.active, productCount: c._count.products }))
  );
});

export const POST = handle(async (req: Request) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const data = await parseJson(req, categoryCreateSchema);
  if (await db.category.findUnique({ where: { id: data.id } })) throw new HttpError(409, 'A category with this id already exists');
  await db.$transaction(async (tx) => {
    await tx.category.create({
      data: { id: data.id, name: fillLocales(data.name), sortOrder: data.sortOrder ?? 0, active: data.active ?? true },
    });
    await audit(tx, actor, { action: 'CATEGORY_CREATED', entityType: 'category', entityId: data.id, details: `Created category ${data.name.en}` });
  });
  return NextResponse.json({ id: data.id }, { status: 201 });
});
