import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const CreateSchema = z.object({
  companyName: z.string().min(2),
  email:       z.string().email(),
  fullName:    z.string().min(2),
  sector:      z.enum(["HUKUK", "EMLAK", "SIGORTA", "SAGLIK"]),
  plan:        z.enum(["FREE", "PRO", "AGENCY"]).default("FREE"),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const { prisma } = await import("@/lib/db");

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        name:      true,
        sector:    true,
        plan:      true,
        isActive:  true,
        createdAt: true,
        _count: {
          select: { widgets: true, leads: true },
        },
      },
    });

    return NextResponse.json(
      tenants.map((t) => ({
        id:          t.id,
        name:        t.name,
        sector:      t.sector,
        plan:        t.plan,
        isActive:    t.isActive,
        widgetCount: t._count.widgets,
        leadCount:   t._count.leads,
        createdAt:   t.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("[GET /api/admin/customers]", err);
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

    const { companyName, email, fullName, sector, plan } = parsed.data;

    const adminSupabase = createAdminClient();

    // Geçici şifre oluştur
    const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password:      tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");

    const baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    const existing = await prisma.tenant.findUnique({ where: { slug: baseSlug } });
    const slug     = existing ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;

    const tenant = await prisma.tenant.create({
      data: { name: companyName, slug, sector, plan },
    });

    await prisma.profile.create({
      data: {
        tenantId:      tenant.id,
        supabaseAuthId: authData.user.id,
        role:          "ADMIN",
        fullName,
      },
    });

    // Hoş geldin e-postası
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env["RESEND_API_KEY"]);
      await resend.emails.send({
        from:    "LeadPing <noreply@leadping.co>",
        to:      email,
        subject: "LeadPing'e Hoş Geldiniz",
        html: `
          <h2>Merhaba ${fullName},</h2>
          <p>LeadPing hesabınız oluşturuldu.</p>
          <p><strong>E-posta:</strong> ${email}<br/>
             <strong>Geçici Şifre:</strong> ${tempPassword}</p>
          <p>Lütfen ilk girişinizde şifrenizi değiştirin.</p>
          <a href="${process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"}/login">
            Giriş Yap →
          </a>
        `,
      });
    } catch (emailErr) {
      console.warn("[POST /api/admin/customers] email gönderilemedi:", emailErr);
    }

    return NextResponse.json({ id: tenant.id, name: tenant.name, tempPassword }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/customers]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
