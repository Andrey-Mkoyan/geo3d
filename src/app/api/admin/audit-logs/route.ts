import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { handle } from '../../../../server/http';
import { requireStaff } from '../../../../server/auth';
import type { AuditLogEntry } from '../../../../types';

export const GET = handle(async () => {
  await requireStaff();
  const logs = await db.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 200 });
  const dto: AuditLogEntry[] = logs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp.toISOString(),
    userId: l.userId ?? 'system',
    userName: l.userName,
    action: l.action,
    entityType: l.entityType as AuditLogEntry['entityType'],
    entityId: l.entityId,
    details: l.details,
  }));
  return NextResponse.json(dto, { headers: { 'Cache-Control': 'no-store' } });
});
