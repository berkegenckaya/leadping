"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role:       "assistant" | "user";
  content:    string;
  timestamp?: string;
}

interface ConversationDetail {
  id:              string;
  messages:        unknown;
  durationSeconds: number;
  createdAt:       string;
  widget:          { name: string; sector: string };
  lead: {
    id:        string;
    name:      string;
    contact:   string;
    summary:   string;
    urgency:   "LOW" | "MED" | "HIGH";
    score:     number;
    status:    string;
    sectorData: Record<string, unknown>;
  } | null;
}

export interface ConversationDetailSheetProps {
  conversationId: string | null;
  open:           boolean;
  onClose:        () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

const URGENCY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:  { label: "Düşük",  cls: "bg-zinc-100 text-zinc-600 border-0" },
  MED:  { label: "Orta",   cls: "bg-amber-100 text-amber-700 border-0" },
  HIGH: { label: "Yüksek", cls: "bg-red-100 text-red-700 border-0" },
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(sec: number) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}d ${s}s` : `${s}s`;
}

function formatTime(ts: string | undefined) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function parseMessages(raw: unknown): Message[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is Message =>
      typeof m === "object" && m !== null && "role" in m && "content" in m
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConversationDetailSheet({
  conversationId,
  open,
  onClose,
}: ConversationDetailSheetProps) {
  const { toast } = useToast();
  const [conv,    setConv]    = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId || !open) return;
    setLoading(true);
    setConv(null);

    fetch(`/api/dashboard/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((data: ConversationDetail) => setConv(data))
      .catch(() => toast({ title: "Hata", description: "Görüşme yüklenemedi.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [conversationId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages = conv ? parseMessages(conv.messages) : [];
  const urgCfg   = conv?.lead?.urgency ? URGENCY_CONFIG[conv.lead.urgency] : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[520px] max-w-full p-0 flex flex-col gap-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-zinc-100 text-[12px] font-semibold text-zinc-600">
                {conv?.lead ? initials(conv.lead.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] font-semibold leading-tight">
                {conv?.lead?.name ?? "Anonim Ziyaretçi"}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {conv?.widget && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-200">
                    {conv.widget.name} · {SECTOR_LABEL[conv.widget.sector] ?? conv.widget.sector}
                  </Badge>
                )}
                {conv && (
                  <span className="text-[11px] text-zinc-400">{formatDate(conv.createdAt)}</span>
                )}
                {conv && (
                  <span className="text-[11px] text-zinc-400">· {formatDuration(conv.durationSeconds)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Lead bilgileri varsa göster */}
          {conv?.lead && (
            <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Lead Bilgileri</span>
              </div>
              <p className="text-[12px] text-zinc-700 leading-relaxed">{conv.lead.summary}</p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-zinc-500">{conv.lead.contact}</span>
                {urgCfg && (
                  <Badge className={`text-[10px] px-1.5 py-0 ${urgCfg.cls}`}>{urgCfg.label}</Badge>
                )}
                <span className="text-[11px] font-medium text-zinc-700">Skor: {conv.lead.score}/10</span>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Mesajlar */}
        {loading ? (
          <div className="px-5 py-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-32")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
            Mesaj bulunamadı.
          </div>
        ) : (
          <ScrollArea className="flex-1 px-5 py-4">
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
                        <p className={cn("text-[10px] mt-1", isUser ? "text-zinc-400 text-right" : "text-zinc-400")}>
                          {formatTime(msg.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Footer: mesaj sayısı */}
        {!loading && messages.length > 0 && (
          <>
            <Separator />
            <div className="px-5 py-3 shrink-0">
              <p className="text-[12px] text-zinc-400 text-center">
                {messages.filter(m => m.role === "user").length} kullanıcı mesajı · {messages.filter(m => m.role === "assistant").length} AI yanıtı
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
