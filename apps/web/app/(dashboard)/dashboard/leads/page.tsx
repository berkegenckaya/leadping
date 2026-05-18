"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { LeadDetailSheet } from "@/components/leads/lead-detail-sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id:              string;
  name:            string;
  contact:         string;
  summary:         string;
  urgency:         "LOW" | "MED" | "HIGH";
  status:          "NEW" | "CONTACTED" | "CONVERTED" | "LOST";
  score:           number;
  createdAt:       string;
  widget:          { name: string; sector: string };
  conversation:    { durationSeconds: number } | null;
}

interface LeadsResponse {
  leads:      Lead[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

const URGENCY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:  { label: "Düşük",  cls: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100 border-0" },
  MED:  { label: "Orta",   cls: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-0" },
  HIGH: { label: "Yüksek", cls: "bg-red-100 text-red-700 hover:bg-red-100 border-0" },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  NEW:       { label: "Yeni",       cls: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-0" },
  CONTACTED: { label: "Görüşüldü",  cls: "bg-violet-100 text-violet-700 hover:bg-violet-100 border-0" },
  CONVERTED: { label: "Dönüştü",    cls: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0" },
  LOST:      { label: "Kayıp",      cls: "bg-zinc-100 text-zinc-500 hover:bg-zinc-100 border-0" },
};

const SECTOR_OPTIONS  = ["", "HUKUK", "EMLAK", "SIGORTA", "SAGLIK"];
const URGENCY_OPTIONS = ["", "HIGH", "MED", "LOW"];
const STATUS_OPTIONS  = ["", "NEW", "CONTACTED", "CONVERTED", "LOST"];

const SECTOR_OPTION_LABEL  = (v: string): string => v ? (SECTOR_LABEL[v] ?? v) : "Tümü";
const URGENCY_OPTION_LABEL = (v: string): string => v ? (URGENCY_CONFIG[v]?.label ?? v) : "Tümü";
const STATUS_OPTION_LABEL  = (v: string): string => v ? (STATUS_CONFIG[v]?.label  ?? v) : "Tümü";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}d ${s}s` : `${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  label, value, options, getLabel, onChange,
}: {
  label:    string;
  value:    string;
  options:  string[];
  getLabel: (v: string) => string;
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-[12px]">
          <SlidersHorizontal className="h-3 w-3" />
          {label}{value ? `: ${getLabel(value)}` : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuLabel className="text-[11px] text-zinc-400">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt || "__all"} value={opt} className="text-[13px]">
              {getLabel(opt)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── ActionsMenu ──────────────────────────────────────────────────────────────

function ActionsMenu({
  lead,
  onView,
  onStatusUpdate,
  onDelete,
}: {
  lead:           Lead;
  onView:         () => void;
  onStatusUpdate: (status: string) => void;
  onDelete:       () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]">
          ···
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="text-[13px]" onSelect={onView}>
          Detayı Gör
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] text-zinc-400">
          Durumu Güncelle
        </DropdownMenuLabel>

        {STATUS_OPTIONS.filter(Boolean).map((s) => (
          <DropdownMenuItem
            key={s}
            className="text-[13px]"
            disabled={lead.status === s}
            onSelect={() => onStatusUpdate(s)}
          >
            {STATUS_CONFIG[s]?.label ?? s}
            {lead.status === s && (
              <span className="ml-auto text-zinc-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-[13px] text-red-500 focus:text-red-500"
          onSelect={onDelete}
        >
          Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { toast } = useToast();

  const [search,  setSearch]  = useState("");
  const [sector,  setSector]  = useState("");
  const [urgency, setUrgency] = useState("");
  const [status,  setStatus]  = useState("");
  const [page,    setPage]    = useState(1);

  const [data,    setData]    = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [sheetOpen,      setSheetOpen]      = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q",       debouncedSearch);
    if (sector)          params.set("sector",  sector);
    if (urgency)         params.set("urgency", urgency);
    if (status)          params.set("status",  status);
    params.set("page", String(page));

    const res = await fetch(`/api/leads?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [debouncedSearch, sector, urgency, status, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, sector, urgency, status]);

  function openDetail(lead: Lead) {
    setSelectedLeadId(lead.id);
    setSheetOpen(true);
  }

  async function handleStatusUpdate(lead: Lead, newStatus: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast({ title: "Durum güncellendi." });
      fetchLeads();
    } else {
      toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" });
    }
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`"${lead.name}" adlı lead'i silmek istediğine emin misin?`)) return;
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Lead silindi." });
      fetchLeads();
    } else {
      toast({ title: "Hata", description: "Silme başarısız.", variant: "destructive" });
    }
  }

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "name",
      header: "Ad",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-zinc-100 text-[10px] font-semibold text-zinc-600">
              {initials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-zinc-900 leading-tight truncate">
              {row.original.name}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">{row.original.contact}</p>
          </div>
        </div>
      ),
    },
    {
      id: "sector",
      header: "Sektör",
      cell: ({ row }) => (
        <span className="text-[12px] text-zinc-600">
          {SECTOR_LABEL[row.original.widget.sector] ?? row.original.widget.sector}
        </span>
      ),
    },
    {
      accessorKey: "summary",
      header: "Konu",
      cell: ({ row }) => (
        <p className="text-[12px] text-zinc-500 truncate max-w-[200px]" title={row.original.summary}>
          {row.original.summary || "—"}
        </p>
      ),
    },
    {
      accessorKey: "urgency",
      header: "Aciliyet",
      cell: ({ row }) => {
        const cfg = URGENCY_CONFIG[row.original.urgency] ?? { label: row.original.urgency, cls: "" };
        return <Badge className={`text-[10px] px-1.5 py-0 ${cfg.cls}`}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: "score",
      header: "Skor",
      cell: ({ row }) => (
        <span className="text-[13px] font-semibold text-zinc-900">{row.original.score}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Durum",
      cell: ({ row }) => {
        const cfg = STATUS_CONFIG[row.original.status] ?? { label: row.original.status, cls: "" };
        return <Badge className={`text-[10px] px-1.5 py-0 ${cfg.cls}`}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Tarih",
      cell: ({ row }) => (
        <span className="text-[12px] text-zinc-500">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionsMenu
          lead={row.original}
          onView={() => openDetail(row.original)}
          onStatusUpdate={(s) => handleStatusUpdate(row.original, s)}
          onDelete={() => handleDelete(row.original)}
        />
      ),
    },
  ];

  const table = useReactTable({
    data:    data?.leads ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-zinc-900">Leads</h1>
            {data && (
              <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-zinc-500">
                {data.total}
              </Badge>
            )}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="İsim, konu ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-[13px]"
            />
          </div>

          <FilterDropdown
            label="Sektör"
            value={sector}
            options={SECTOR_OPTIONS}
            getLabel={SECTOR_OPTION_LABEL}
            onChange={setSector}
          />
          <FilterDropdown
            label="Aciliyet"
            value={urgency}
            options={URGENCY_OPTIONS}
            getLabel={URGENCY_OPTION_LABEL}
            onChange={setUrgency}
          />
          <FilterDropdown
            label="Durum"
            value={status}
            options={STATUS_OPTIONS}
            getLabel={STATUS_OPTION_LABEL}
            onChange={setStatus}
          />

          {(sector || urgency || status || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[12px] text-zinc-500"
              onClick={() => { setSearch(""); setSector(""); setUrgency(""); setStatus(""); }}
            >
              Temizle
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider py-2.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-100">
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                      </div>
                    </TableCell>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j} className="py-2.5">
                        <Skeleton className="h-3 w-16" />
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-12 text-center text-sm text-zinc-400">
                    Lead bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-zinc-100 cursor-pointer hover:bg-zinc-50"
                    onClick={() => openDetail(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-2.5"
                        onClick={
                          cell.column.id === "actions"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-zinc-400">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} / {data.total} lead
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[12px] text-zinc-600 px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpdate={fetchLeads}
      />
    </>
  );
}
