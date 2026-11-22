import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { handle } from '../../../server/http';
import { toProductDTO } from '../../../server/dto';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const products = await db.product.findMany({ where: { published: true, categoryRef: { active: true } }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(products.map(toProductDTO));
});
