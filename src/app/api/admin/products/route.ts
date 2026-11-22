import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { handle, parseJson, HttpError, badRequest } from '../../../../server/http';
import { requireStaff } from '../../../../server/auth';
import { audit } from '../../../../server/services/audit.service';
import { toProductDTO } from '../../../../server/dto';
import { fillLocales, productCreateSchema } from '../../../../server/validation/catalog';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireStaff();
  const products = await db.product.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(products.map(toProductDTO));
});

export const POST = handle(async (req: Request) => {
  const actor = await requireStaff(['operator_orders', 'operator_prod']);
  const d = await parseJson(req, productCreateSchema);
  if (!(await db.category.findUnique({ where: { id: d.category } }))) throw badRequest('Unknown category');
  if (await db.product.findUnique({ where: { slug: d.slug } })) throw new HttpError(409, 'A product with this slug already exists');
  const created = await db.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        slug: d.slug,
        title: fillLocales(d.title),
        description: fillLocales(d.description),
        category: d.category,
        priceGel: d.priceGel,
        imageUrl: d.images[0],
        images: d.images,
        dimensionsMm: d.dimensionsMm,
        weightGrams: d.weightGrams,
        materials: d.materials,
        colors: [],
        leadTimeHours: d.leadTimeHours,
        inStock: d.inStock,
        published: d.published,
        featured: d.featured,
        tags: d.tags,
        modelUrl: d.modelUrl ?? null,
        presetModel: d.presetModel ?? null,
      },
    });
    await audit(tx, actor, { action: 'PRODUCT_CREATED', entityType: 'product', entityId: p.id, details: `Created "${d.title.en}" (${d.priceGel} GEL)` });
    return p;
  });
  return NextResponse.json(toProductDTO(created), { status: 201 });
});
