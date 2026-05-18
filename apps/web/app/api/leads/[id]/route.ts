import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function makeSupabase(request: NextRequest) {
  return createServerClient(
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
}

async function getTenantId(request: NextRequest): Promise<string | null> {
  const supabase = makeSupabase(request);
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
    const lead = await prisma.lead.findFirst({
      where:  { id: params.id, tenantId },
      select: {
        id:         true,
        name:       true,
        contact:    true,
        summary:    true,
        urgency:    true,
        status:     true,
        score:      true,
        sectorData: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ notes: true } as any),
        createdAt:  true,
        widget:       { select: { name: true, sector: true } },
        conversation: { select: { durationSeconds: true, messages: true } },
      },
    });

    if (!lead) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const l = lead as any;
    return NextResponse.json({ ...l, createdAt: new Date(l.createdAt).toISOString() });
  } catch (err) {
    console.error("[GET /api/leads/[id]]", err);
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

    const body = (await request.json()) as { status?: string };
    const { prisma } = await import("@/lib/db");

    const lead = await prisma.lead.findFirst({ where: { id: params.id, tenantId } });
    if (!lead) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

    const updated = await prisma.lead.update({
      where:  { id: params.id },
      data:   { ...(body.status ? { status: body.status as any } : {}) },
      select: { id: true, status: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/leads/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prisma } = await import("@/lib/db");
    const lead = await prisma.lead.findFirst({ where: { id: params.id, tenantId } });
    if (!lead) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

    await prisma.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/leads/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
