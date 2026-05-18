import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!profile?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversation = await prisma.conversation.findFirst({
      where:  { id: params.id, tenantId: profile.tenantId },
      select: {
        id:              true,
        messages:        true,
        durationSeconds: true,
        createdAt:       true,
        widget:          { select: { name: true, sector: true } },
        lead: {
          select: {
            id:        true,
            name:      true,
            contact:   true,
            summary:   true,
            urgency:   true,
            score:     true,
            status:    true,
            sectorData: true,
          },
        },
      },
    });

    if (!conversation) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

    return NextResponse.json({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/dashboard/conversations/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
