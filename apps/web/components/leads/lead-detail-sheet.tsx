"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role:       "assistant" | "user";
  content:    string;
  timestamp?: string;
}

interface LeadDetail {
  id:         string;
  name:       string;
  contact:    string;
  summary:    string;
  urgency:    "LOW" | "MED" | "HIGH";
  status:     "NEW" | "CONTACTED" | "CONVERTED" | "LOST";
  score:      number;
  sectorData: Record<string, unknown>;
  notes:      string | null;
  createdAt:  string;
  widget:     { name: string; sector: string };
  conversation: {
    durationSeconds: number;
    messages: unknown;
  } | null;
}

export interface LeadDetailSheetProps {
  leadId:   string | null;
  open:     boolean;
  onClose:  () => void;
  onUpdate: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

const URGENCY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:  { label: "Düşük",  cls: "bg-zinc-100 text-zinc-600 border-0 hover:bg-zinc-100" },
  MED:  { label: "Orta",   cls: "bg-amber-100 text-amber-700 border-0 hover:bg-amber-100" },
  HIGH: { label: "Yüksek", cls: "bg-red-100 text-red-700 border-0 hover:bg-red-100" },
};

const STATUS_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: "NEW",       label: "Yeni",      cls: "bg-blue-100 text-blue-700 border-0 hover:bg-blue-100" },
  { value: "CONTACTED", label: "Görüşüldü", cls: "bg-violet-100 text-violet-700 border-0 hover:bg-violet-100" },
  { value: "CONVERTED", label: "Dönüştü",   cls: "bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100" },
  { value: "LOST",      label: "Kayıp",     cls: "bg-zinc-100 text-zinc-500 border-0 hover:bg-zinc-100" },
];

function getStatusConfig(value: string) {
  return STATUS_OPTIONS.find((s) => s.value === value) ?? STATUS_OPTIONS[0]!;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function formatTime(ts: string | undefined) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString("tr-TR", {
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function parseMessages(raw: unknown): Message[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is Message =>
      typeof m === "object" && m !== null &&
      ("role" in m) && ("content" in m)
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-[12px]">
      <span className="text-zinc-400 shrink-0">{label}</span>
      <span className="text-zinc-900 font-medium text-right">{value}</span>
    </div>
  );
}

function SectorDataFields({
  sector,
  data,
}: {
  sector: string;
  data: Record<string, unknown>;
}) {
  switch (sector) {
    case "HUKUK":
      return <MetaRow label="Dava Türü" value={data["davaType"] as string} />;
    case "EMLAK":
      return (
        <>
          <MetaRow label="Bütçe"  value={data["budget"]   as string} />
          <MetaRow label="Konum"  value={data["location"] as string} />
        </>
      );
    case "SIGORTA":
      return <MetaRow label="Poliçe Türü" value={data["policyType"] as string} />;
    case "SAGLIK":
      return <MetaRow label="Şikayet Tipi" value={data["complaintType"] as string} />;
    default:
      return null;
  }
}

function SkeletonContent() {
  return (
    <div className="px-5 py-4 space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-20 w-full mt-4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LeadDetailSheet({ leadId, open, onClose, onUpdate }: LeadDetailSheetProps) {
  const { toast } = useToast();

  const [lead,         setLead]         = useState<LeadDetail | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [status,       setStatus]       = useState("");
  const [notes,        setNotes]        = useState("");
  const [savingNotes,  setSavingNotes]  = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!leadId || !open) return;
    setLoading(true);
    setLead(null);

    fetch(`/api/leads/${leadId}`)
      .then((r) => r.json())
      .then((data: LeadDetail) => {
        setLead(data);
        setStatus(data.status);
        setNotes(data.notes ?? "");
      })
      .catch(() => toast({ title: "Hata", description: "Lead yüklenemedi.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [leadId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(newStatus: string) {
    if (!lead || updatingStatus) return;
    const prev = status;
    setStatus(newStatus); // optimistic
    setUpdatingStatus(true);

    const res = await fetch(`/api/leads/${lead.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });

    setUpdatingStatus(false);
    if (!res.ok) {
      setStatus(prev);
      toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
    } else {
      toast({ title: "Durum güncellendi." });
      onUpdate();
    }
  }

  async function handleSaveNotes() {
    if (!lead) return;
    setSavingNotes(true);
    const res = await fetch(`/api/leads/${lead.id}/notes`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    if (res.ok) {
      toast({ title: "Notlar kaydedildi." });
    } else {
      toast({ title: "Hata", description: "Notlar kaydedilemedi.", variant: "destructive" });
    }
  }

  const statusCfg  = getStatusConfig(status);
  const urgencyCfg = lead ? (URGENCY_CONFIG[lead.urgency] ?? { label: lead.urgency, cls: "" }) : null;
  const messages   = lead?.conversation ? parseMessages(lead.conversation.messages) : [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] max-w-full p-0 flex flex-col gap-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-zinc-100 text-[12px] font-semibold text-zinc-600">
                  {lead ? initials(lead.name) : "…"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="text-[15px] font-semibold leading-tight truncate">
                  {lead?.name ?? "—"}
                </SheetTitle>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {lead && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-200">
                      {SECTOR_LABEL[lead.widget.sector] ?? lead.widget.sector}
                    </Badge>
                  )}
                  <span className="text-[11px] text-zinc-400">
                    {lead ? formatDate(lead.createdAt) : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={updatingStatus || !lead}
                  className={cn("h-7 gap-1 text-[11px] px-2 shrink-0", statusCfg.cls)}
                >
                  {statusCfg.label}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="text-[13px]"
                    disabled={status === opt.value}
                    onSelect={() => handleStatusChange(opt.value)}
                  >
                    {opt.label}
                    {status === opt.value && <span className="ml-auto text-zinc-400">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        {/* Body */}
        {loading ? (
          <SkeletonContent />
        ) : !lead ? (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
            Yüklenemedi.
          </div>
        ) : (
          <Tabs defaultValue="ozet" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-5 mt-3 mb-0 shrink-0 w-auto justify-start gap-0 h-8 bg-zinc-100 p-0.5 rounded-lg">
              <TabsTrigger value="ozet"     className="text-[12px] h-7 px-3">Özet</TabsTrigger>
              <TabsTrigger value="gorusme"  className="text-[12px] h-7 px-3">Görüşme</TabsTrigger>
              <TabsTrigger value="notlar"   className="text-[12px] h-7 px-3">Notlar</TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Özet ── */}
            <TabsContent value="ozet" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full px-5 py-4">
                {/* AI özeti */}
                <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-3 mb-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                    AI Özeti
                  </p>
                  <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {lead.summary || "Özet henüz oluşturulmamış."}
                  </p>
                </div>

                {/* Metadata */}
                <div className="space-y-2 mb-4">
                  <MetaRow label="İletişim"  value={lead.contact} />
                  <MetaRow
                    label="Aciliyet"
                    value={urgencyCfg?.label}
                  />
                  <MetaRow label="Skor"      value={`${lead.score} / 10`} />
                  <MetaRow label="Widget"    value={lead.widget.name} />
                </div>

                {/* Sektör verisi */}
                {Object.keys(lead.sectorData).length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">
                      Sektör Verisi
                    </p>
                    <div className="space-y-2">
                      <SectorDataFields
                        sector={lead.widget.sector}
                        data={lead.sectorData}
                      />
                    </div>
                  </>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── Tab 2: Görüşme ── */}
            <TabsContent value="gorusme" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full px-5 py-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center pt-8">
                    Görüşme kaydı bulunamadı.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, i) => {
                      const isUser = msg.role === "user";
                      return (
                        <div key={i} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                            isUser
                              ? "bg-zinc-900 text-white rounded-br-sm"
                              : "bg-zinc-100 text-zinc-800 rounded-bl-sm"
                          )}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.timestamp && (
                              <p className={cn(
                                "text-[10px] mt-1",
                                isUser ? "text-zinc-400 text-right" : "text-zinc-400"
                              )}>
                                {formatTime(msg.timestamp)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── Tab 3: Notlar ── */}
            <TabsContent value="notlar" className="flex-1 overflow-hidden mt-0">
              <div className="h-full flex flex-col px-5 py-4 gap-3">
                <Textarea
                  placeholder="Bu lead hakkında notlarınızı buraya yazın…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 resize-none text-[13px] text-zinc-700 bg-zinc-50 border-zinc-200 min-h-0"
                />
                <Button
                  size="sm"
                  disabled={savingNotes}
                  onClick={handleSaveNotes}
                  className="self-end"
                >
                  {savingNotes ? "Kaydediliyor…" : "Kaydet"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-[12px] text-zinc-500"
            onClick={() => toast({ title: "PDF dışa aktarma yakında gelecek." })}
          >
            <Download className="h-3.5 w-3.5" />
            PDF İndir
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
