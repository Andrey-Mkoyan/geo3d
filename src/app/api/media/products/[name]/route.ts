import { handle, notFound } from '../../../../../server/http';
import { getStorage } from '../../../../../server/storage';

/** Public product photos (only the products/ prefix is exposed). */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ name: string }> }) => {
  const { name } = await ctx.params;
  if (!/^[a-f0-9]{32}\.webp$/.test(name)) throw notFound();
  const file = await getStorage().get(`products/${name}`);
  if (!file) throw notFound();
  return new Response(new Uint8Array(file.data), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
});
