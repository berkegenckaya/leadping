import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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
    if (!profile?.tenantId) {
      return NextResponse.json({ error: "Profile bulunamadı." }, { status: 404 });
    }

    const tenantId = profile.tenantId;

    const now        = new Date();
    const weekStart  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const w2Start    = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalLeads,
      weekLeads,
      prevWeekLeads,
      convertedLeads,
      weekConverted,
      prevWeekConverted,
      scoreAgg,
      weekScoreAgg,
      prevWeekScoreAgg,
      recentLeads,
      activeWidgets,
    ] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId, createdAt: { gte: weekStart } } }),
      prisma.lead.count({ where: { tenantId, createdAt: { gte: w2Start, lt: weekStart } } }),
      prisma.lead.count({ where: { tenantId, status: "CONVERTED" } }),
      prisma.lead.count({ where: { tenantId, status: "CONVERTED", createdAt: { gte: weekStart } } }),
      prisma.lead.count({ where: { tenantId, status: "CONVERTED", createdAt: { gte: w2Start, lt: weekStart } } }),
      prisma.lead.aggregate({ where: { tenantId }, _avg: { score: true } }),
      prisma.lead.aggregate({ where: { tenantId, createdAt: { gte: weekStart } },  _avg: { score: true } }),
      prisma.lead.aggregate({ where: { tenantId, createdAt: { gte: w2Start, lt: weekStart } }, _avg: { score: true } }),
      prisma.conversation.findMany({
        where:   { tenantId },
        orderBy: { createdAt: "desc" },
        take:    5,
        select: {
          id:              true,
          messages:        true,
          durationSeconds: true,
          createdAt:       true,
          widget:          { select: { name: true } },
          lead: {
            select: {
              name:    true,
              summary: true,
              urgency: true,
              score:   true,
            },
          },
        },
      }),
      prisma.widget.findMany({
        where:   { tenantId, isActive: true },
        orderBy: { createdAt: "desc" },
        take:    5,
        select: {
          id:       true,
          name:     true,
          sector:   true,
          isActive: true,
          _count:   { select: { leads: true } },
        },
      }),
    ]);

    const pct = (a: number, b: number) =>
      b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0;

    const conversionRate     = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const weekConvRate       = weekLeads  > 0 ? (weekConverted  / weekLeads)  * 100 : 0;
    const prevWeekConvRate   = prevWeekLeads > 0 ? (prevWeekConverted / prevWeekLeads) * 100 : 0;
    const avgScore           = scoreAgg._avg?.score           ?? 0;
    const weekAvgScore       = weekScoreAgg._avg?.score       ?? 0;
    const prevWeekAvgScore   = prevWeekScoreAgg._avg?.score   ?? 0;

    return NextResponse.json({
      metrics: {
        totalLeads,
        weekLeads,
        weekTrend:       pct(weekLeads,     prevWeekLeads),
        conversionRate:  Math.round(conversionRate * 10) / 10,
        conversionTrend: pct(weekConvRate,  prevWeekConvRate),
        averageScore:    Math.round(avgScore * 10) / 10,
        scoreTrend:      pct(weekAvgScore,  prevWeekAvgScore),
      },
      recentLeads: recentLeads.map((c) => {
        const msgs = (c.messages as { role: string; content: string }[]) ?? [];
        const firstUserMsg = msgs.find((m) => m.role === "user")?.content ?? "";
        return {
          id:              c.id,
          name:            c.lead?.name    ?? "Anonim",
          summary:         c.lead?.summary ?? firstUserMsg.slice(0, 120),
          urgency:         c.lead?.urgency ?? null,
          score:           c.lead?.score   ?? null,
          durationSeconds: c.durationSeconds,
          createdAt:       c.createdAt.toISOString(),
          widgetName:      c.widget?.name ?? "",
          hasLead:         !!c.lead,
        };
      }),
      activeWidgets: activeWidgets.map((w) => ({
        id:        w.id,
        name:      w.name,
        sector:    w.sector,
        isActive:  w.isActive,
        leadCount: w._count.leads,
      })),
    });
  } catch (err) {
    console.error("[/api/dashboard/metrics]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
