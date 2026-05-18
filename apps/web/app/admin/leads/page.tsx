import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdminLeadsFilter } from "@/components/admin/leads-filter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string; name: string; summary: string;
  urgency: "LOW" | "MED" | "HIGH"; status: string;
  score: number; createdAt: string;
  tenant: { id: string; name: string };
  widget: { name: string; sector: string };
  conversation: { durationSeconds: number } | null;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getLeads(qs: string): Promise<LeadsResponse> {
  const h      = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";
  const proto  = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${proto}://${host}/api/admin/leads${qs ? `?${qs}` : ""}`, {
    headers: { cookie },
    cache:   "no-store",
  });

  if (!res.ok) return { leads: [], total: 0, page: 1, totalPages: 1 };
  return res.json() as Promise<LeadsResponse>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  LOW:  { label: "Düşük",  className: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100" },
  MED:  { label: "Orta",   className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  HIGH: { label: "Yüksek", className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  const sp = searchParams as Record<string, string>;
  if (sp.tenantId) qs.set("tenantId", sp.tenantId);
  if (sp.urgency)  qs.set("urgency",  sp.urgency);
  if (sp.status)   qs.set("status",   sp.status);
  if (sp.page)     qs.set("page",     sp.page);

  const data = await getLeads(qs.toString());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-zinc-900">
          Tüm Lead&apos;ler
          <span className="ml-2 text-[13px] font-normal text-zinc-400">
            ({data.total})
          </span>
        </h1>
        <AdminLeadsFilter />
      </div>

      {data.leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <p className="text-[14px] font-medium text-zinc-700">Lead bulunamadı</p>
          <p className="mt-1 text-sm text-zinc-400">Filtrelerinizi değiştirip tekrar deneyin.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 bg-zinc-50">
                <TableHead className="pl-4 text-[11px] text-zinc-400 font-medium">İsim</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Özet</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Müşteri</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Widget</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Aciliyet</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium text-right">Skor</TableHead>
                <TableHead className="pr-4 text-[11px] text-zinc-400 font-medium">Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leads.map((lead) => {
                const urg = URGENCY_CONFIG[lead.urgency];
                return (
                  <TableRow key={lead.id} className="border-zinc-100">
                    <TableCell className="pl-4 py-2.5">
                      <span className="text-[13px] font-medium text-zinc-900">{lead.name}</span>
                    </TableCell>
                    <TableCell className="py-2.5 max-w-[180px]">
                      <p className="text-[12px] text-zinc-500 truncate" title={lead.summary}>
                        {lead.summary}
                      </p>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-[12px] text-zinc-700">{lead.tenant.name}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-[12px] text-zinc-500">{lead.widget.name}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge className={`text-[10px] px-1.5 py-0 ${urg.className}`}>
                        {urg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-[12px] font-medium text-zinc-900">{lead.score}</span>
                    </TableCell>
                    <TableCell className="pr-4 py-2.5">
                      <span className="text-[12px] text-zinc-500">{formatDate(lead.createdAt)}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
