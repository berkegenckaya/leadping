import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSkillMeta } from "@leadping/skills";
import { WidgetForm } from "@/components/admin/widget-form";

async function getWidget(id: string) {
  const h      = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";
  const proto  = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${proto}://${host}/api/admin/widgets`, {
    headers: { cookie },
    cache:   "no-store",
  });

  if (!res.ok) return null;

  const widgets = await res.json() as {
    id: string; name: string; sector: string;
    tenant: { id: string } | null;
  }[];

  return widgets.find((w) => w.id === id) ?? null;
}

async function getWidgetDetail(id: string) {
  const h      = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";
  const proto  = process.env.NODE_ENV === "production" ? "https" : "http";

  const { prisma } = await import("@/lib/db");

  const widget = await prisma.widget.findUnique({
    where:  { id },
    select: {
      id: true, name: true, sector: true, allowedDomain: true,
      systemPrompt: true, primaryColor: true, welcomeMessage: true,
      skillsConfig: true, maxTurns: true, tenantId: true,
      tenantCustomization: true,
    },
  });

  return widget;
}

async function getTenants() {
  const h      = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";
  const proto  = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${proto}://${host}/api/admin/customers`, {
    headers: { cookie },
    cache:   "no-store",
  });

  if (!res.ok) return [];
  const data = await res.json() as { id: string; name: string }[];
  return data.map((t) => ({ id: t.id, name: t.name }));
}

export default async function EditWidgetPage({
  params,
}: {
  params: { id: string };
}) {
  const [widget, tenants] = await Promise.all([
    getWidgetDetail(params.id),
    getTenants(),
  ]);

  const skillMeta = getAllSkillMeta().map(({ id, name, description, alwaysOn }) => ({
    id, name, description, alwaysOn,
  }));

  if (!widget) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/widgets" className="text-[12px] text-zinc-400 hover:text-zinc-600">
          ← Widget&apos;lar
        </Link>
        <h1 className="mt-1 text-[18px] font-semibold text-zinc-900">
          Widget Düzenle: {widget.name}
        </h1>
      </div>

      <WidgetForm
        initial={{
          ...widget,
          id:           params.id,
          skillsConfig: (widget.skillsConfig as Record<string, unknown>) ?? {},
          maxTurns:     widget.maxTurns,
          logoUrl:      (widget.tenantCustomization as Record<string, string> | null)?.["logoUrl"] ?? "",
        }}
        tenants={tenants}
        skills={skillMeta}
      />
    </div>
  );
}
