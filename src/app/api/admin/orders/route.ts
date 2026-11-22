import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { handle } from '../../../../server/http';
import { requireStaff } from '../../../../server/auth';
import { orderInclude, toOrderDTO } from '../../../../server/dto';
import type { Prisma } from '../../../../generated/prisma/client';

/** List orders. Filters: ?status=&paymentStatus=&q= (order number / name / phone / email) */
export const GET = handle(async (req: Request) => {
  await requireStaff();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const paymentStatus = url.searchParams.get('paymentStatus');
  const q = url.searchParams.get('q')?.trim();

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as Prisma.EnumOrderStatusFilter['equals'] } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as Prisma.EnumPaymentStatusFilter['equals'] } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customerName: { contains: q, mode: 'insensitive' } },
            { customerPhone: { contains: q } },
            { customerEmail: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orders = await db.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 500 });
  return NextResponse.json(orders.map((o) => toOrderDTO(o, { staff: true })), { headers: { 'Cache-Control': 'no-store' } });
});
