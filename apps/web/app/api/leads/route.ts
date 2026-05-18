import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prisma } = await import("@/lib/db");
    const profile = await prisma.profile.findUnique({
      where:  { supabaseAuthId: user.id },
      select: { tenantId: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile bulunamadı." }, { status: 404 });

    const sp      = request.nextUrl.searchParams;
    const sector  = sp.get("sector")  ?? "";
    const urgency = sp.get("urgency") ?? "";
    const status  = sp.get("status")  ?? "";
    const q       = sp.get("q")       ?? "";
    const page    = Math.max(1, Number(sp.get("page") ?? "1"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: profile.tenantId };

    if (sector)  where.widget  = { sector };
    if (urgency) where.urgency = urgency;
    if (status)  where.status  = status;
    if (q) {
      where.OR = [
        { name:    { contains: q, mode: "insensitive" } },
        { contact: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * PAGE_SIZE,
        take:    PAGE_SIZE,
        select: {
          id:        true,
          name:      true,
          contact:   true,
          summary:   true,
          urgency:   true,
          status:    true,
          score:     true,
          createdAt: true,
          widget:       { select: { name: true, sector: true } },
          conversation: { select: { durationSeconds: true } },
        },
      }),
    ]);

    return NextResponse.json({
      leads: leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      total,
      page,
      pageSize:   PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
