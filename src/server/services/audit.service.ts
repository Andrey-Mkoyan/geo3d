import 'server-only';
import type { Prisma } from '../../generated/prisma/client';

export interface Actor {
  id: string | null;
  name: string;
}

export const SYSTEM_CUSTOMER = (name: string): Actor => ({ id: null, name: `${name} (Online Client)` });

/** Writes an audit entry. Pass the transaction client so it commits atomically with the change. */
export async function audit(
  tx: Prisma.TransactionClient,
  actor: Actor,
  entry: { action: string; entityType: string; entityId: string; details: string }
) {
  await tx.auditLog.create({
    data: { userId: actor.id, userName: actor.name, ...entry },
  });
}
