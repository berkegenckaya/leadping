import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const { prisma } = await import("@/lib/db");

    const profile = await prisma.profile.findFirst({
      where:  { tenantId: params.id },
      select: { supabaseAuthId: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";

    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      profile.supabaseAuthId,
      { password: tempPassword }
    );

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ tempPassword });
  } catch (err) {
    console.error("[POST /api/admin/customers/[id]/reset-password]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
