import { NextResponse } from 'next/server';
import { badRequest, handle } from '../../../../../server/http';
import { requireStaff } from '../../../../../server/auth';
import { processProductImage, randomKey } from '../../../../../server/image';
import { getStorage } from '../../../../../server/storage';

export const POST = handle(async (req: Request) => {
  await requireStaff(['operator_orders', 'operator_prod']);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw badRequest('Attach an image in the "file" field');
  const webp = await processProductImage(Buffer.from(await file.arrayBuffer()));
  const key = randomKey('products');
  await getStorage().put(key, webp, 'image/webp');
  return NextResponse.json({ url: `/api/media/${key}` }, { status: 201 });
});
