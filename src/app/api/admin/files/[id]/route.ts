import { db } from '../../../../../server/db';
import { handle, notFound } from '../../../../../server/http';
import { requireStaff } from '../../../../../server/auth';
import { getStorage } from '../../../../../server/storage';

/** Streams a payment screenshot. Staff only; never cached publicly. `?thumb=1` for the thumbnail. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireStaff(['operator_orders']);
  const { id } = await ctx.params;
  const proof = await db.paymentProof.findUnique({ where: { id } });
  if (!proof) throw notFound();

  const thumb = new URL(req.url).searchParams.get('thumb') === '1';
  const file = await getStorage().get(thumb ? proof.thumbKey : proof.fileKey);
  if (!file) throw notFound('File missing');

  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
});
