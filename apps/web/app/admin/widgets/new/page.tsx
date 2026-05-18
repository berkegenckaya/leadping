import { headers } from "next/headers";
import Link from "next/link";
import { getAllSkillMeta } from "@leadping/skills";
import { WidgetForm } from "@/components/admin/widget-form";

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

export default async function NewWidgetPage() {
  const [tenants, skillMeta] = await Promise.all([
    getTenants(),
    Promise.resolve(
      getAllSkillMeta().map(({ id, name, description, alwaysOn }) => ({
        id, name, description, alwaysOn,
      }))
    ),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/widgets" className="text-[12px] text-zinc-400 hover:text-zinc-600">
          ← Widget&apos;lar
        </Link>
        <h1 className="mt-1 text-[18px] font-semibold text-zinc-900">Yeni Widget Oluştur</h1>
      </div>

      <WidgetForm tenants={tenants} skills={skillMeta} />
    </div>
  );
}
