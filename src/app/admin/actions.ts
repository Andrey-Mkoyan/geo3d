'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '../../server/auth';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/admin',
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: 'Invalid email or password' };
    throw err; // the success redirect is thrown by Next and must propagate
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: '/admin/login' });
}
