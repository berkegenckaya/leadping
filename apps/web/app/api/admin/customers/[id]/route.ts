import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PatchSchema = z.object({
  plan:     z.enum(["FREE", "PRO", "AGENCY"]).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => d.plan !== undefined || d.isActive !== undefined, {
  message: "En az bir alan gerekli.",
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const { prisma } = await import("@/lib/db");

    const tenant = await prisma.tenant.findUnique({
      where:  { id: params.id },
      select: {
        id: true, name: true, sector: true, plan: true,
        isActive: true, createdAt: true, updatedAt: true,
        profiles: {
          select: { supabaseAuthId: true, fullName: true, role: true },
        },
        widgets: {
          select: {
            id: true, name: true, sector: true, isActive: true,
            createdAt: true,
            _count: { select: { leads: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        leads: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, name: true, summary: true, urgency: true,
            status: true, score: true, createdAt: true,
            widget: { select: { name: true } },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 });
    }

    // Supabase'den email çek
    let email: string | null = null;
    const adminProfile = tenant.profiles[0];
    if (adminProfile) {
      const adminClient = createAdminClient();
      const { data } = await adminClient.auth.admin.getUserById(adminProfile.supabaseAuthId);
      email = data.user?.email ?? null;
    }

    return NextResponse.json({
      ...tenant,
      email,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      widgets: tenant.widgets.map((w) => ({
        ...w,
        leadCount: w._count.leads,
        createdAt: w.createdAt.toISOString(),
      })),
      leads: tenant.leads.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[GET /api/admin/customers/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

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

    const { prisma } = await import("@/lib/db");

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data:  parsed.data,
      select: { id: true, name: true, plan: true, isActive: true },
    });

    return NextResponse.json(tenant);
  } catch (err) {
    console.error("[PATCH /api/admin/customers/[id]]", err);
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

    // Supabase auth kullanıcısını da sil
    const profile = await prisma.profile.findFirst({
      where:  { tenantId: params.id },
      select: { supabaseAuthId: true },
    });

    if (profile) {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.deleteUser(profile.supabaseAuthId);
    }

    await prisma.tenant.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/customers/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
