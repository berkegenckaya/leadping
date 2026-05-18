import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Tenant'ın değiştirebileceği alanlar — asla systemPrompt/token/tenantId dokunmaz
const PatchSchema = z.object({
  primaryColor:    z.string().optional(),
  welcomeMessage:  z.string().optional(),
  logoUrl:         z.string().url().optional().or(z.literal("")),
  skillsConfig:    z.record(z.unknown()).optional(),
});

async function getTenantId(request: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {}, remove() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { prisma } = await import("@/lib/db");
  const profile = await prisma.profile.findUnique({
    where:  { supabaseAuthId: user.id },
    select: { tenantId: true },
  });

  return profile?.tenantId ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prisma } = await import("@/lib/db");

    const widget = await prisma.widget.findFirst({
      where:  { id: params.id, tenantId },
      select: {
        id: true, name: true, token: true, sector: true,
        primaryColor: true, welcomeMessage: true, isActive: true,
        skillsConfig: true, systemPrompt: true, allowedDomain: true,
        tenantCustomization: true,
      },
    });

    if (!widget) return NextResponse.json({ error: "Widget bulunamadı." }, { status: 404 });

    return NextResponse.json(widget);
  } catch (err) {
    console.error("[GET /api/dashboard/widgets/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body   = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");

    // Widget'ın bu tenant'a ait olduğunu doğrula
    const existing = await prisma.widget.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Widget bulunamadı." }, { status: 404 });

    const { logoUrl, skillsConfig, ...rest } = parsed.data;

    // Tenant'ın özelleştirmeleri tenantCustomization JSON'una kaydedilir
    const tenantCustomization = {
      ...(existing.tenantCustomization as Record<string, unknown> | null ?? {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    };

    const widget = await prisma.widget.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(skillsConfig !== undefined
          ? { skillsConfig: skillsConfig as Prisma.InputJsonValue }
          : {}),
        tenantCustomization: tenantCustomization as Prisma.InputJsonValue,
      },
      select: {
        id: true, primaryColor: true, welcomeMessage: true,
        skillsConfig: true, tenantCustomization: true,
      },
    });

    return NextResponse.json(widget);
  } catch (err) {
    console.error("[PATCH /api/dashboard/widgets/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
