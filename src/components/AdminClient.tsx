'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../lib/AppContext';
import { AdminWorkspace, NewSpoolInput } from './AdminWorkspace';
import type { AuditLogEntry, MaterialSpool, Order, OrderStatus, PrinterUnit } from '../types';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

const post = (url: string, data: unknown) =>
  api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

/** Loads admin data from /api/admin/* and wires the workspace actions to the API. */
export function AdminClient() {
  const { language } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [printers, setPrinters] = useState<PrinterUnit[]>([]);
  const [materials, setMaterials] = useState<MaterialSpool[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [o, p, m, a] = await Promise.all([
        api<Order[]>('/api/admin/orders'),
        api<PrinterUnit[]>('/api/admin/printers'),
        api<MaterialSpool[]>('/api/admin/materials'),
        api<AuditLogEntry[]>('/api/admin/audit-logs'),
      ]);
      setOrders(o);
      setPrinters(p);
      setMaterials(m);
      setAuditLogs(a);
      setLoadError(null);
      setLoaded(true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    refresh();
    // Pick up new orders / uploaded screenshots without a manual reload
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Runs an action, reports server-side rule violations (e.g. "payment must be verified"), then reloads
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    }
    await refresh();
  };

  if (!loaded) {
    return (
      <div className="py-24 text-center text-sm text-neutral-500">
        {loadError ? <span className="text-red-600">{loadError}</span> : 'Loading...'}
      </div>
    );
  }

  return (
    <AdminWorkspace
      orders={orders}
      printers={printers}
      materials={materials}
      auditLogs={auditLogs}
      language={language}
      onUpdateOrderStatus={(id: string, status: OrderStatus, note?: string) =>
        run(() => post(`/api/admin/orders/${id}/status`, { status, note }))
      }
      onUpdateOrderPrice={(id: string, totalGel: number) =>
        run(() => post(`/api/admin/orders/${id}/price`, { totalGel }))
      }
      onReviewPayment={(id, decision) => run(() => post(`/api/admin/orders/${id}/payment`, decision))}
      onAddMaterial={async (spool: NewSpoolInput) => {
        try {
          await post('/api/admin/materials', spool);
          await refresh();
          return true;
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Could not add spool');
          return false;
        }
      }}
      onDeleteMaterial={(id: string) => run(() => api(`/api/admin/materials/${id}`, { method: 'DELETE' }))}
      onUpdateMaterialSpool={(id: string, remainingGrams: number) =>
        run(() =>
          api(`/api/admin/materials/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remainingGrams }),
          })
        )
      }
    />
  );
}
