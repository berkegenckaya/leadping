import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const { prisma } = await import("@/lib/db");

    const sp       = request.nextUrl.searchParams;
    const tenantId = sp.get("tenantId") ?? "";
    const sector   = sp.get("sector")   ?? "";
    const urgency  = sp.get("urgency")  ?? "";
    const status   = sp.get("status")   ?? "";
    const dateFrom = sp.get("dateFrom") ?? "";
    const dateTo   = sp.get("dateTo")   ?? "";
    const page     = Math.max(1, Number(sp.get("page") ?? "1"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (urgency)  where.urgency  = urgency;
    if (status)   where.status   = status;
    if (sector)   where.widget   = { sector };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo);
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * PAGE_SIZE,
        take:    PAGE_SIZE,
        select: {
          id: true, name: true, summary: true,
          urgency: true, status: true, score: true, createdAt: true,
          tenant: { select: { id: true, name: true } },
          widget: { select: { name: true, sector: true } },
          conversation: { select: { durationSeconds: true } },
        },
      }),
    ]);

    return NextResponse.json({
      leads: leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      total,
      page,
      pageSize:   PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    console.error("[GET /api/admin/leads]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
