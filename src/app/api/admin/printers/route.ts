import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { handle } from '../../../../server/http';
import { requireStaff } from '../../../../server/auth';
import type { PrinterUnit } from '../../../../types';

export const GET = handle(async () => {
  await requireStaff();
  const printers = await db.printer.findMany({ orderBy: { id: 'asc' } });
  const dto: PrinterUnit[] = printers.map((p) => ({
    id: p.id,
    name: p.name,
    model: p.model,
    technology: p.technology as PrinterUnit['technology'],
    buildVolumeMm: p.buildVolumeMm as unknown as PrinterUnit['buildVolumeMm'],
    supportedMaterials: p.supportedMaterials as PrinterUnit['supportedMaterials'],
    status: p.status,
    currentOrderId: p.currentOrderId ?? undefined,
    currentProgressPercent: p.currentProgressPercent ?? undefined,
    timeRemainingMinutes: p.timeRemainingMinutes ?? undefined,
    totalPrintHours: p.totalPrintHours,
    lastMaintenanceDate: p.lastMaintenanceDate,
  }));
  return NextResponse.json(dto);
});
