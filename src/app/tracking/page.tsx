'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useApp } from '../../lib/AppContext';
import { paymentText } from '../../i18n/payment';

/** Lost the email/SMS link? Find the order again with order number + checkout phone. */
export default function TrackingLookupPage() {
  const { language } = useApp();
  const router = useRouter();
  const p = paymentText[language];

  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/track/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, phone }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 404) throw new Error(p.lookupNotFound);
      if (!res.ok) throw new Error(body.error || p.genericError);
      router.push(`/track/${body.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : p.genericError);
      setBusy(false);
    }
  };

  const inputCls =
    'w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <section className="py-16 bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-md mx-auto px-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{p.lookupTitle}</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{p.lookupHint}</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">{p.orderNumber}</label>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="GEO-1001"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{p.phone}</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+995 5XX XXX XXX"
              className={inputCls}
            />
          </div>
          {error && <div className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            {p.lookupBtn}
          </button>
        </form>
      </div>
    </section>
  );
}
