import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerActions } from "@/components/admin/customer-actions";
import { AssignWidgetDialog } from "@/components/admin/assign-widget-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerDetail {
  id: string; name: string; sector: string; plan: string;
  isActive: boolean; email: string | null;
  createdAt: string; updatedAt: string;
  profiles: { supabaseAuthId: string; fullName: string; role: string }[];
  widgets: {
    id: string; name: string; sector: string;
    isActive: boolean; leadCount: number; createdAt: string;
  }[];
  leads: {
    id: string; name: string; summary: string;
    urgency: string; status: string; score: number;
    createdAt: string; widget: { name: string };
  }[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const h      = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";
  const proto  = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${proto}://${host}/api/admin/customers/${id}`, {
    headers: { cookie },
    cache:   "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<CustomerDetail>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

const URGENCY_STYLE: Record<string, string> = {
  LOW:  "bg-zinc-100 text-zinc-600",
  MED:  "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "Yeni", CONTACTED: "İletişimde",
  CONVERTED: "Dönüştürüldü", LOST: "Kayıp",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const customer = await getCustomer(params.id);
  if (!customer) notFound();

  const adminProfile = customer.profiles[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/customers"
              className="text-[12px] text-zinc-400 hover:text-zinc-600"
            >
              ← Müşteriler
            </Link>
          </div>
          <h1 className="mt-1 text-[20px] font-semibold text-zinc-900">
            {customer.name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-200">
              {SECTOR_LABEL[customer.sector] ?? customer.sector}
            </Badge>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                customer.isActive ? "text-emerald-600" : "text-zinc-400"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${customer.isActive ? "bg-emerald-400" : "bg-zinc-300"}`} />
              {customer.isActive ? "Aktif" : "Pasif"}
            </span>
          </div>
        </div>

        <CustomerActions
          customerId={customer.id}
          isActive={customer.isActive}
          plan={customer.plan}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sol: Müşteri Bilgileri */}
        <Card className="shadow-none border-zinc-200">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-[13px] font-semibold text-zinc-900">
              Müşteri Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            <InfoRow label="Şirket"  value={customer.name} />
            <InfoRow label="E-posta" value={customer.email ?? "—"} />
            <InfoRow label="Yetkili" value={adminProfile?.fullName ?? "—"} />
            <InfoRow
              label="Plan"
              value={
                <span className="font-medium text-zinc-900">{customer.plan}</span>
              }
            />
            <InfoRow label="Kayıt"    value={formatDate(customer.createdAt)} />
            <InfoRow label="Güncelleme" value={formatDate(customer.updatedAt)} />
          </CardContent>
        </Card>

        {/* Orta: Widget'lar */}
        <Card className="shadow-none border-zinc-200">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-[13px] font-semibold text-zinc-900">
              Widget&apos;lar ({customer.widgets.length})
            </CardTitle>
            <AssignWidgetDialog
              customerId={customer.id}
              assignedWidgetIds={customer.widgets.map((w) => w.id)}
            />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {customer.widgets.length === 0 ? (
              <p className="text-[12px] text-zinc-400">Atanmış widget yok.</p>
            ) : (
              customer.widgets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${w.isActive ? "bg-emerald-400" : "bg-zinc-300"}`} />
                    <span className="text-[12px] font-medium text-zinc-900 truncate">
                      {w.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-[11px] text-zinc-500">{w.leadCount} lead</span>
                    <Button asChild variant="ghost" size="sm" className="h-6 text-[11px] px-2">
                      <Link href={`/admin/widgets/${w.id}/edit`}>Düzenle</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sağ: Son Lead'ler */}
        <Card className="shadow-none border-zinc-200">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-[13px] font-semibold text-zinc-900">
              Son Lead&apos;ler
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {customer.leads.length === 0 ? (
              <p className="text-[12px] text-zinc-400">Henüz lead yok.</p>
            ) : (
              customer.leads.map((lead) => (
                <div key={lead.id} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-zinc-900">{lead.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${URGENCY_STYLE[lead.urgency] ?? ""}`}
                      >
                        {lead.urgency}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-700">{lead.score}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">{lead.summary}</p>
                  <p className="text-[10px] text-zinc-300">{STATUS_LABEL[lead.status] ?? lead.status}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-zinc-400 shrink-0">{label}</span>
      <span className="text-[12px] text-zinc-700 text-right">{value}</span>
    </div>
  );
}
