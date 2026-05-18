import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/admin/auth";

const PatchSchema = z.object({
  name:           z.string().min(2).optional(),
  sector:         z.enum(["HUKUK", "EMLAK", "SIGORTA", "SAGLIK"]).optional(),
  allowedDomain:  z.string().min(3).optional(),
  systemPrompt:   z.string().min(10).optional(),
  primaryColor:   z.string().optional(),
  welcomeMessage: z.string().optional(),
  logoUrl:        z.string().url().optional().or(z.literal("")),
  skillsConfig:   z.record(z.unknown()).optional(),
  maxTurns:       z.number().int().min(1).max(10).optional(),
  isActive:       z.boolean().optional(),
  tenantId:       z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const body   = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { skillsConfig, logoUrl, ...rest } = parsed.data;

    const { prisma } = await import("@/lib/db");

    const widget = await prisma.widget.update({
      where: { id: params.id },
      data:  {
        ...rest,
        ...(skillsConfig !== undefined
          ? { skillsConfig: skillsConfig as Prisma.InputJsonValue }
          : {}),
        ...(logoUrl !== undefined
          ? { tenantCustomization: { logoUrl } as Prisma.InputJsonValue }
          : {}),
      },
      select: { id: true, name: true, sector: true, isActive: true },
    });

    return NextResponse.json(widget);
  } catch (err) {
    console.error("[PATCH /api/admin/widgets/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const { prisma } = await import("@/lib/db");
    await prisma.widget.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/widgets/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
