'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useApp } from '../../../lib/AppContext';
import { OrderTrackerView } from '../../../components/OrderTrackerView';
import { paymentText } from '../../../i18n/payment';
import type { BankAccount, Order } from '../../../types';

export default function PrivateTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const { language } = useApp();
  const p = paymentText[language];

  const [order, setOrder] = useState<Order | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (res.status === 404) return setState('missing');
      if (!res.ok) return setState('error');
      const body = await res.json();
      setOrder(body.order);
      setBankAccounts(body.bankAccounts);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    load();
    // Refresh so the customer sees status changes (payment verified, production, ...)
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  if (state === 'loading') {
    return <div className="py-24 text-center text-sm text-neutral-500">...</div>;
  }
  if (state === 'error') {
    return <div className="py-24 text-center text-sm text-red-600">{p.genericError}</div>;
  }

  return (
    <OrderTrackerView
      order={state === 'ready' ? order : null}
      language={language}
      token={token}
      bankAccounts={bankAccounts}
      onRefresh={load}
    />
  );
}
