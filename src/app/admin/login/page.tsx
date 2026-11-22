'use client';

import { useActionState } from 'react';
import { Shield } from 'lucide-react';
import { loginAction } from '../actions';

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  const inputCls =
    'w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <section className="py-20 bg-neutral-100 dark:bg-neutral-950 min-h-[70vh]">
      <div className="max-w-sm mx-auto px-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>Restricted Workshop Portal</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">Staff sign in</h1>

        <form action={action} className="mt-6 space-y-3">
          <input name="email" type="email" required autoComplete="username" placeholder="Email" className={inputCls} />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className={inputCls}
          />
          {state?.error && <div className="text-xs font-medium text-red-600 dark:text-red-400">{state.error}</div>}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-sm font-bold cursor-pointer"
          >
            {pending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </section>
  );
}
