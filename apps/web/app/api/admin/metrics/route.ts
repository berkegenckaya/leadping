import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const { prisma } = await import("@/lib/db");

    const now      = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      totalWidgets,
      activeWidgets,
      monthLeads,
      recentCustomers,
      topWidgets,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.widget.count(),
      prisma.widget.count({ where: { isActive: true } }),
      prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, sector: true, plan: true, createdAt: true, isActive: true },
      }),
      prisma.widget.findMany({
        orderBy: { leads: { _count: "desc" } },
        take: 5,
        select: {
          id: true,
          name: true,
          sector: true,
          isActive: true,
          tenant: { select: { name: true } },
          _count: { select: { leads: true } },
        },
      }),
    ]);

    return NextResponse.json({
      totalCustomers,
      totalWidgets,
      activeWidgets,
      monthLeads,
      recentCustomers: recentCustomers.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
      topWidgets: topWidgets.map((w) => ({
        id:           w.id,
        name:         w.name,
        sector:       w.sector,
        isActive:     w.isActive,
        tenantName:   w.tenant.name,
        leadCount:    w._count.leads,
      })),
    });
  } catch (err) {
    console.error("[GET /api/admin/metrics]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
