import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { HttpError } from './http';
import { rateLimit } from './ratelimit';
import type { Actor } from './services/audit.service';

export type StaffRoleName = 'admin' | 'operator_orders' | 'operator_prod';

const credsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  trustHost: true,
  pages: { signIn: '/admin/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        try {
          rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
        } catch {
          return null;
        }
        const user = await db.adminUser.findUnique({ where: { email } });
        if (!user || !user.active) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});

export interface StaffSession extends Actor {
  id: string;
  role: StaffRoleName;
}

/**
 * Server-side guard used by EVERY admin route handler (not only middleware).
 * Re-checks the user in the DB so deactivated accounts lose access immediately.
 */
export async function requireStaff(roles?: StaffRoleName[]): Promise<StaffSession> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new HttpError(401, 'Authentication required');
  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user || !user.active) throw new HttpError(401, 'Account disabled');
  if (roles && user.role !== 'admin' && !roles.includes(user.role)) {
    throw new HttpError(403, 'You do not have permission to do this');
  }
  return { id: user.id, name: `${user.name} (${user.role})`, role: user.role };
}

/** Same check for server components (returns null instead of throwing). */
export async function getStaffOrNull() {
  try {
    return await requireStaff();
  } catch {
    return null;
  }
}
