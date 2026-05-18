import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/admin/auth";

const CreateSchema = z.object({
  name:           z.string().min(2),
  sector:         z.enum(["HUKUK", "EMLAK", "SIGORTA", "SAGLIK"]),
  allowedDomain:  z.string().min(3),
  systemPrompt:   z.string().min(10),
  primaryColor:   z.string().default("#000000"),
  welcomeMessage: z.string().min(2),
  logoUrl:        z.string().url().optional().or(z.literal("")),
  skillsConfig:   z.record(z.unknown()).optional(),
  maxTurns:       z.number().int().min(1).max(10).default(5),
  tenantId:       z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const { prisma } = await import("@/lib/db");

    const widgets = await prisma.widget.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, sector: true,
        isActive: true, createdAt: true,
        tenant: { select: { id: true, name: true } },
        _count: { select: { leads: true } },
      },
    });

    return NextResponse.json(
      widgets.map((w) => ({
        id:          w.id,
        name:        w.name,
        sector:      w.sector,
        isActive:    w.isActive,
        createdAt:   w.createdAt.toISOString(),
        tenant:      w.tenant,
        leadCount:   w._count.leads,
      }))
    );
  } catch (err) {
    console.error("[GET /api/admin/widgets]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const body   = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { tenantId, skillsConfig, logoUrl, ...rest } = parsed.data;

    const { prisma } = await import("@/lib/db");

    // Atasız widget için sistem tenant'ı bul veya oluştur
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      let unassigned = await prisma.tenant.findFirst({
        where: { slug: "__unassigned__" },
        select: { id: true },
      });
      if (!unassigned) {
        unassigned = await prisma.tenant.create({
          data: { name: "Atasız", slug: "__unassigned__", sector: rest.sector, plan: "FREE" },
          select: { id: true },
        });
      }
      resolvedTenantId = unassigned.id;
    }

    const widget = await prisma.widget.create({
      data: {
        ...rest,
        tenantId:            resolvedTenantId,
        createdBySuperAdmin: true,
        ...(skillsConfig ? { skillsConfig: skillsConfig as Prisma.InputJsonValue } : {}),
        ...(logoUrl ? { tenantCustomization: { logoUrl } as Prisma.InputJsonValue } : {}),
      },
      select: { id: true, name: true, sector: true },
    });

    return NextResponse.json(widget, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/widgets]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
