import { NextResponse } from 'next/server';
import { badRequest, clientIp, handle } from '../../../../../server/http';
import { rateLimit } from '../../../../../server/ratelimit';
import { MAX_UPLOAD_BYTES } from '../../../../../server/image';
import { submitProof } from '../../../../../server/services/payments.service';
import { proofMetaSchema } from '../../../../../server/validation/orders';

/** Customer uploads a payment screenshot (multipart: `file` + optional amount/payer/bank/transferDate). */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  rateLimit(`proof:${clientIp(req)}`, 15, 60 * 60_000);
  const { token } = await ctx.params;

  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > MAX_UPLOAD_BYTES + 100_000) throw badRequest('File too large (max 10 MB)', 'FILE_TOO_LARGE');

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw badRequest('Attach the screenshot as "file"');
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest('File too large (max 10 MB)', 'FILE_TOO_LARGE');

  const text = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  const meta = proofMetaSchema.parse({
    amountClaimedGel: text('amountClaimedGel'),
    payerName: text('payerName'),
    bankName: text('bankName'),
    transferDate: text('transferDate'),
  });

  const result = await submitProof(token, Buffer.from(await file.arrayBuffer()), meta);
  return NextResponse.json(result, { status: 201 });
});
