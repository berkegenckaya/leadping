import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { prisma } = await import("@/lib/db");

    const widget = await prisma.widget.findUnique({
      where:  { token: params.token },
      select: {
        isActive:           true,
        sector:             true,
        primaryColor:       true,
        welcomeMessage:     true,
        skillsConfig:       true,
        tenantCustomization: true,
        tenant: {
          select: { name: true },
        },
      },
    });

    if (!widget) {
      return NextResponse.json({ error: "Widget bulunamadı." }, { status: 404 });
    }

    const skillsConfig = (widget.skillsConfig as Record<string, unknown>) ?? {};
    const customization = (widget.tenantCustomization as Record<string, string> | null) ?? {};

    // Aktif skill id'leri (collectLeadInfo alwaysOn olduğu için client'a gerek yok)
    const activeSkillIds = Object.entries(skillsConfig)
      .filter(([, cfg]) => (cfg as Record<string, unknown>)["enabled"] === true)
      .map(([id]) => id);

    // Public config: sadece widget'ın UI'ına gereken alanlar
    const publicSkillsConfig: Record<string, unknown> = {};
    for (const id of activeSkillIds) {
      const cfg = skillsConfig[id] as Record<string, unknown>;
      if (id === "calendly" && cfg["url"]) {
        publicSkillsConfig["calendly"] = { url: cfg["url"] };
      }
    }

    const body = {
      isActive:      widget.isActive,
      sector:        widget.sector,
      primaryColor:  widget.primaryColor,
      welcomeMessage: widget.welcomeMessage,
      logoUrl:       customization["logoUrl"] ?? null,
      tenantName:    widget.tenant.name,
      skills:        activeSkillIds,
      skillsConfig:  publicSkillsConfig,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",  
      },
    });
  } catch (err) {
    console.error("[GET /api/widget/config/[token]]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
