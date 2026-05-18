import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/auth";

const AssignSchema = z.object({
  tenantId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const body   = await request.json();
    const parsed = AssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");

    const widget = await prisma.widget.update({
      where:  { id: params.id },
      data:   { tenantId: parsed.data.tenantId },
      select: { id: true, name: true, tenant: { select: { name: true } } },
    });

    return NextResponse.json(widget);
  } catch (err) {
    console.error("[POST /api/admin/widgets/[id]/assign]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
