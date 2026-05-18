"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConversationDetailSheet } from "@/components/conversations/conversation-detail-sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  totalLeads:      number;
  weekLeads:       number;
  weekTrend:       number;
  conversionRate:  number;
  conversionTrend: number;
  averageScore:    number;
  scoreTrend:      number;
}

interface RecentLead {
  id:              string;
  name:            string;
  summary:         string;
  urgency:         "LOW" | "MED" | "HIGH" | null;
  score:           number | null;
  durationSeconds: number;
  createdAt:       string;
  widgetName:      string;
  hasLead:         boolean;
}

interface ActiveWidget {
  id:        string;
  name:      string;
  sector:    string;
  isActive:  boolean;
  leadCount: number;
}

interface DashboardData {
  metrics:       Metrics;
  recentLeads:   RecentLead[];
  activeWidgets: ActiveWidget[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

const URGENCY_CONFIG = {
  LOW:  { label: "Düşük",  className: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100" },
  MED:  { label: "Orta",   className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  HIGH: { label: "Yüksek", className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

function formatDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}d ${s}s` : `${s}s`;
}

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="text-zinc-400">—</span>;
  const up = value > 0;
  return (
    <span className={up ? "text-emerald-600" : "text-red-500"}>
      {up ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, trend, suffix = "" }: {
  label: string; value: number | string; trend: number; suffix?: string;
}) {
  return (
    <Card className="shadow-none border-zinc-200">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-3xl font-semibold text-zinc-900">{value}{suffix}</p>
        <p className="mt-1 text-[12px]">
          <Trend value={trend} />
          <span className="ml-1 text-zinc-400">geçen haftaya göre</span>
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [sheetOpen,      setSheetOpen]      = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/metrics")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: DashboardData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function openConversation(id: string) {
    setSelectedConvId(id);
    setSheetOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-none border-zinc-200">
              <CardContent className="px-4 pb-4 pt-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
        Veriler yüklenemedi.
      </div>
    );
  }

  const { metrics, recentLeads, activeWidgets } = data;

  return (
    <>
      <div className="space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Toplam Lead"    value={metrics.totalLeads}     trend={metrics.weekTrend} />
          <MetricCard label="Bu Hafta"       value={metrics.weekLeads}      trend={metrics.weekTrend} />
          <MetricCard label="Dönüşüm Oranı" value={metrics.conversionRate} suffix="%" trend={metrics.conversionTrend} />
          <MetricCard label="Ortalama Skor"  value={metrics.averageScore}   suffix="/10" trend={metrics.scoreTrend} />
        </div>

        {/* Bottom: conversations + widgets */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Son görüşmeler */}
          <Card className="shadow-none border-zinc-200">
            <CardHeader className="px-4 pt-4 pb-3">
              <CardTitle className="text-[13px] font-semibold text-zinc-900">
                Son Görüşmeler
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {recentLeads.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-zinc-400">Henüz görüşme yok.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-100">
                      <TableHead className="pl-4 text-[11px] text-zinc-400 font-medium">İsim</TableHead>
                      <TableHead className="text-[11px] text-zinc-400 font-medium">Konu / İlk Mesaj</TableHead>
                      <TableHead className="text-[11px] text-zinc-400 font-medium">Aciliyet</TableHead>
                      <TableHead className="text-[11px] text-zinc-400 font-medium text-right">Skor</TableHead>
                      <TableHead className="pr-4 text-[11px] text-zinc-400 font-medium text-right">Süre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLeads.map((lead) => {
                      const urg = lead.urgency ? URGENCY_CONFIG[lead.urgency] : null;
                      return (
                        <TableRow
                          key={lead.id}
                          className="border-zinc-100 cursor-pointer hover:bg-zinc-50"
                          onClick={() => openConversation(lead.id)}
                        >
                          <TableCell className="pl-4 py-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="bg-zinc-100 text-[9px] font-semibold text-zinc-600">
                                  {lead.hasLead ? initials(lead.name) : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-[12px] font-medium text-zinc-900 whitespace-nowrap">
                                  {lead.name}
                                </span>
                                {lead.hasLead && (
                                  <span className="text-[10px] text-emerald-600 font-medium">Lead</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 max-w-[160px]">
                            <p className="text-[12px] text-zinc-500 truncate" title={lead.summary}>
                              {lead.summary || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="py-2">
                            {urg ? (
                              <Badge className={`text-[10px] px-1.5 py-0 ${urg.className}`}>
                                {urg.label}
                              </Badge>
                            ) : (
                              <span className="text-[12px] text-zinc-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <span className="text-[12px] font-medium text-zinc-900">
                              {lead.score ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="pr-4 py-2 text-right">
                            <span className="text-[12px] text-zinc-500">
                              {formatDuration(lead.durationSeconds)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Aktif widget'lar */}
          <Card className="shadow-none border-zinc-200">
            <CardHeader className="px-4 pt-4 pb-3">
              <CardTitle className="text-[13px] font-semibold text-zinc-900">
                Aktif Widget&apos;lar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {activeWidgets.length === 0 ? (
                <p className="text-sm text-zinc-400">Aktif widget yok.</p>
              ) : (
                <div className="space-y-2">
                  {activeWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                        <span className="text-[13px] font-medium text-zinc-900 truncate">
                          {widget.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-200">
                          {SECTOR_LABEL[widget.sector] ?? widget.sector}
                        </Badge>
                      </div>
                      <span className="ml-4 shrink-0 text-[12px] text-zinc-500">
                        {widget.leadCount} lead
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConversationDetailSheet
        conversationId={selectedConvId}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
