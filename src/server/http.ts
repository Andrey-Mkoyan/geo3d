import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, ZodType } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const badRequest = (msg: string, code?: string) => new HttpError(400, msg, code);

/** Wraps a route handler: converts HttpError / ZodError into JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
          { status: 422 }
        );
      }
      console.error('[api] unhandled error', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest('Invalid JSON body');
  }
  return schema.parse(body);
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
