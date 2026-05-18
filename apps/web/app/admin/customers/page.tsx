import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AddCustomerDialog } from "@/components/admin/add-customer-dialog";
import { CustomerRowActions } from "@/components/admin/customer-row-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string; name: string; sector: string; plan: string;
  isActive: boolean; widgetCount: number; leadCount: number; createdAt: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getCustomers(): Promise<Customer[]> {
  const h      = headers();
  const cookie = h.get("cookie") ?? "";
  const host   = h.get("host")   ?? "localhost:3000";
  const proto  = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${proto}://${host}/api/admin/customers`, {
    headers: { cookie },
    cache:   "no-store",
  });

  if (!res.ok) return [];
  return res.json() as Promise<Customer[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

const PLAN_STYLE: Record<string, string> = {
  FREE:   "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
  PRO:    "bg-blue-100 text-blue-700 hover:bg-blue-100",
  AGENCY: "bg-purple-100 text-purple-700 hover:bg-purple-100",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-zinc-900">Müşteriler</h1>
        <AddCustomerDialog />
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <p className="text-[14px] font-medium text-zinc-700">Henüz müşteri yok</p>
          <p className="mt-1 text-sm text-zinc-400">
            Sağ üst köşedeki butonu kullanarak ilk müşteriyi ekleyin.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 bg-zinc-50">
                <TableHead className="pl-4 text-[11px] text-zinc-400 font-medium">Şirket</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Sektör</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Plan</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium text-right">Widget</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium text-right">Lead</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Kayıt</TableHead>
                <TableHead className="text-[11px] text-zinc-400 font-medium">Durum</TableHead>
                <TableHead className="pr-4 text-[11px] text-zinc-400 font-medium text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="border-zinc-100">
                  <TableCell className="pl-4 py-2.5">
                    <span className="text-[13px] font-medium text-zinc-900">{c.name}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-[12px] text-zinc-500">
                      {SECTOR_LABEL[c.sector] ?? c.sector}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge className={`text-[10px] px-1.5 py-0 ${PLAN_STYLE[c.plan] ?? ""}`}>
                      {c.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <span className="text-[12px] text-zinc-700">{c.widgetCount}</span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <span className="text-[12px] text-zinc-700">{c.leadCount}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-[12px] text-zinc-500">{formatDate(c.createdAt)}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        c.isActive ? "text-emerald-600" : "text-zinc-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? "bg-emerald-400" : "bg-zinc-300"}`} />
                      {c.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 py-2.5 text-right">
                    <CustomerRowActions
                      customerId={c.id}
                      isActive={c.isActive}
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
