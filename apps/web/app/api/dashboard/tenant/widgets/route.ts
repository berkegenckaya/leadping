import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/db");

    const widgets = await prisma.widget.findMany({
      where:  { tenantId },
      select: {
        id: true, name: true, token: true, sector: true,
        primaryColor: true, welcomeMessage: true, isActive: true,
        skillsConfig: true, systemPrompt: true, allowedDomain: true,
        tenantCustomization: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ widgets });
  } catch (err) {
    console.error("[GET /api/dashboard/tenant/widgets]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
