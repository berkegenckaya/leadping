import { headers } from "next/headers";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { WidgetRowActions } from "@/components/admin/widget-row-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Widget {
  id: string; name: string; sector: string; isActive: boolean;
  createdAt: string; leadCount: number;
  tenant: { id: string; name: string } | null;
}

interface Tenant { id: string; name: string }

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string, cookie: string, host: string): Promise<T> {
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const res   = await fetch(`${proto}://${host}${path}`, {
    headers: { cookie },
    cache:   "no-store",
  });
  if (!res.ok) return [] as unknown as T;
  return res.json() as Promise<T>;
}

async function getData() {
  const h      = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";

  const [widgets, customers] = await Promise.all([
    fetchJson<Widget[]>("/api/admin/widgets",   cookie, host),
    fetchJson<Tenant[]>("/api/admin/customers", cookie, host),
  ]);

  return { widgets, tenants: customers };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WidgetsAdminPage() {
  const { widgets, tenants } = await getData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-zinc-900">Widget&apos;lar</h1>
        <Button asChild size="sm" className="h-8 text-[12px]">
          <Link href="/admin/widgets/new">+ Yeni Widget</Link>
        </Button>
      </div>

      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <p className="text-[14px] font-medium text-zinc-700">Henüz widget yok</p>
          <p className="mt-1 text-sm text-zinc-400">
            İlk widget&apos;ı oluşturmak için &quot;Yeni Widget&quot; butonuna tıklayın.
          </p>
          <Button asChild size="sm" className="mt-4 h-8 text-[12px]">
            <Link href="/admin/widgets/new">Widget Oluştur</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 bg-zinc-50">
                <TableHead className="pl-4 text-[11px] text-zinc-400 font-medium">Widget Adı</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Sektör</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Müşteri</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium text-right">Lead</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Durum</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Tarih</TableHead>
                <TableHead className="pr-4 text-[11px] text-zinc-400 font-medium text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {widgets.map((w) => (
                <TableRow key={w.id} className="border-zinc-100">
                  <TableCell className="pl-4 py-2.5">
                    <span className="text-[13px] font-medium text-zinc-900">{w.name}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-200"
                    >
                      {SECTOR_LABEL[w.sector] ?? w.sector}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5">
                    {w.tenant && w.tenant.name !== "Atasız" ? (
                      <Link
                        href={`/admin/customers/${w.tenant.id}`}
                        className="text-[12px] text-zinc-700 hover:underline"
                      >
                        {w.tenant.name}
                      </Link>
                    ) : (
                      <span className="text-[12px] text-zinc-400 italic">Atanmadı</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <span className="text-[12px] text-zinc-700">{w.leadCount}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        w.isActive ? "text-emerald-600" : "text-zinc-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${w.isActive ? "bg-emerald-400" : "bg-zinc-300"}`} />
                      {w.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-[12px] text-zinc-500">{formatDate(w.createdAt)}</span>
                  </TableCell>
                  <TableCell className="pr-4 py-2.5 text-right">
                    <WidgetRowActions
                      widgetId={w.id}
                      tenants={tenants}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
