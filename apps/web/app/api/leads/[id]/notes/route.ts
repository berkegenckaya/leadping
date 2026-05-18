import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

async function getTenantId(request: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(_n: string, _v: string, _o: CookieOptions) {},
        remove(_n: string, _o: CookieOptions) {},
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notes } = (await request.json()) as { notes: string };
    const { prisma } = await import("@/lib/db");

    const lead = await prisma.lead.findFirst({ where: { id: params.id, tenantId } });
    if (!lead) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.lead.update({ where: { id: params.id }, data: { notes } as any });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/leads/[id]/notes]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
