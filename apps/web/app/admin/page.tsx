import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  totalCustomers: number;
  totalWidgets:   number;
  activeWidgets:  number;
  monthLeads:     number;
  recentCustomers: {
    id: string; name: string; sector: string;
    plan: string; isActive: boolean; createdAt: string;
  }[];
  topWidgets: {
    id: string; name: string; sector: string;
    isActive: boolean; tenantName: string; leadCount: number;
  }[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getMetrics(): Promise<Metrics | null> {
  const h     = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";
  const proto  = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${proto}://${host}/api/admin/metrics`, {
    headers: { cookie },
    cache:   "no-store",
  });

  if (!res.ok) return null;
  return res.json() as Promise<Metrics>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

const PLAN_COLOR: Record<string, string> = {
  FREE:   "bg-zinc-100 text-zinc-600",
  PRO:    "bg-blue-100 text-blue-700",
  AGENCY: "bg-purple-100 text-purple-700",
};

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="shadow-none border-zinc-200">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-3xl font-semibold text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOverviewPage() {
  const data = await getMetrics();

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[18px] font-semibold text-zinc-900">Genel Bakış</h1>

      {/* Metrikler */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Toplam Müşteri" value={data.totalCustomers} />
        <MetricCard label="Toplam Widget"  value={data.totalWidgets} />
        <MetricCard label="Aktif Widget"   value={data.activeWidgets} />
        <MetricCard label="Bu Ay Lead"     value={data.monthLeads} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Son müşteriler */}
        <Card className="shadow-none border-zinc-200">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-[13px] font-semibold text-zinc-900">
              Son Kayıt Olan Müşteriler
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {data.recentCustomers.length === 0 ? (
              <p className="text-sm text-zinc-400">Henüz müşteri yok.</p>
            ) : (
              data.recentCustomers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        c.isActive ? "bg-emerald-400" : "bg-zinc-300"
                      }`}
                    />
                    <span className="text-[13px] font-medium text-zinc-900 truncate">
                      {c.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-200"
                    >
                      {SECTOR_LABEL[c.sector] ?? c.sector}
                    </Badge>
                  </div>
                  <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_COLOR[c.plan] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {c.plan}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* En çok lead üreten widgetlar */}
        <Card className="shadow-none border-zinc-200">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-[13px] font-semibold text-zinc-900">
              En Çok Lead Üreten Widget&apos;lar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {data.topWidgets.length === 0 ? (
              <p className="text-sm text-zinc-400">Henüz widget yok.</p>
            ) : (
              data.topWidgets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        w.isActive ? "bg-emerald-400" : "bg-zinc-300"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">
                        {w.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">{w.tenantName}</p>
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 text-[12px] font-medium text-zinc-700">
                    {w.leadCount} lead
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
