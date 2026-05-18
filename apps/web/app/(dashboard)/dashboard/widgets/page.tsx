"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WidgetData {
  id:             string;
  name:           string;
  token:          string;
  sector:         string;
  primaryColor:   string;
  welcomeMessage: string;
  isActive:       boolean;
  systemPrompt:   string;
  allowedDomain:  string;
  skillsConfig:   Record<string, unknown>;
  tenantCustomization: Record<string, unknown> | null;
}

interface TenantWidgetsResponse {
  widgets: WidgetData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => null);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WidgetsPage() {
  const [widgets, setWidgets]         = useState<WidgetData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState<string>("");
  const [saving, setSaving]           = useState(false);
  const [copied, setCopied]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");

  // Form state
  const [primaryColor,   setPrimaryColor]   = useState("#000000");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [logoUrl,        setLogoUrl]        = useState("");
  const [calendlyEnabled, setCalendlyEnabled] = useState(false);
  const [calendlyUrl,    setCalendlyUrl]    = useState("");

  // Tenant'ın widget listesini çek
  useEffect(() => {
    fetch("/api/dashboard/tenant/widgets")
      .then((r) => r.ok ? r.json() : { widgets: [] })
      .then((data: TenantWidgetsResponse) => {
        setWidgets(data.widgets ?? []);
        const first = data.widgets?.[0];
        if (first) loadWidget(first);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadWidget(w: WidgetData) {
    setSelectedId(w.id);
    setPrimaryColor(w.primaryColor ?? "#000000");
    setWelcomeMessage(w.welcomeMessage ?? "");
    const custom = w.tenantCustomization as Record<string, string> | null;
    setLogoUrl(custom?.["logoUrl"] ?? "");
    const cal = (w.skillsConfig["calendly"] as Record<string, unknown>) ?? {};
    setCalendlyEnabled(cal["enabled"] === true);
    setCalendlyUrl((cal["url"] as string) ?? "");
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setSaveMsg("");

    const skillsConfig: Record<string, unknown> = {};
    if (calendlyEnabled) {
      skillsConfig["calendly"] = { enabled: true, url: calendlyUrl };
    }

    const res = await fetch(`/api/dashboard/widgets/${selectedId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        primaryColor,
        welcomeMessage,
        logoUrl,
        skillsConfig,
      }),
    });

    setSaving(false);
    setSaveMsg(res.ok ? "Kaydedildi." : "Hata oluştu.");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  const selected = widgets.find((w) => w.id === selectedId);
  const embedCode = selected
    ? `<script src="${process.env.NEXT_PUBLIC_WIDGET_URL ?? "http://localhost:3001"}/widget.js" data-token="${selected.token}" defer></script>`
    : "";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] font-medium text-zinc-700">Henüz atanmış widget yok</p>
        <p className="mt-1 text-sm text-zinc-400">
          Yöneticinizle iletişime geçin ve bir widget atanmasını isteyin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-zinc-900">Widget Ayarları</h1>
        {widgets.length > 1 && (
          <Select value={selectedId} onValueChange={(v) => {
            const w = widgets.find((x) => x.id === v);
            if (w) loadWidget(w);
          }}>
            <SelectTrigger className="h-8 w-48 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {widgets.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sol: Görsel Ayarlar */}
        <div className="space-y-4">
          <Card className="shadow-none border-zinc-200">
            <CardHeader className="px-5 pt-4 pb-3">
              <CardTitle className="text-[13px] font-semibold text-zinc-900">
                Görsel Ayarlar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Ana Renk</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-zinc-200 p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    className="h-9 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px]">Karşılama Mesajı</Label>
                <Input
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Merhaba! Size nasıl yardımcı olabiliriz?"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px]">Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://sirketiniz.com/logo.png"
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skill'ler */}
          <Card className="shadow-none border-zinc-200">
            <CardHeader className="px-5 pt-4 pb-3">
              <CardTitle className="text-[13px] font-semibold text-zinc-900">
                Entegrasyonlar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {/* collectLeadInfo — her zaman aktif */}
              <div className="flex items-start justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                <div className="space-y-0.5">
                  <p className="text-[12px] font-medium text-zinc-900">Lead Toplama</p>
                  <p className="text-[11px] text-zinc-500">
                    Görüşme bitiminde lead bilgilerini otomatik kaydeder.
                  </p>
                </div>
                <Badge className="mt-0.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                  Her zaman aktif
                </Badge>
              </div>

              {/* Calendly */}
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[12px] font-medium text-zinc-900">Calendly Randevu</p>
                    <p className="text-[11px] text-zinc-500">
                      Kullanıcıya randevu linki sunar.
                    </p>
                  </div>
                  <Switch
                    checked={calendlyEnabled}
                    onCheckedChange={setCalendlyEnabled}
                  />
                </div>
                {calendlyEnabled && (
                  <Input
                    value={calendlyUrl}
                    onChange={(e) => setCalendlyUrl(e.target.value)}
                    placeholder="https://calendly.com/..."
                    className="h-8 text-[12px]"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kaydet */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="h-8 text-[12px]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
            {saveMsg && (
              <span className="text-[12px] text-emerald-600">{saveMsg}</span>
            )}
          </div>
        </div>

        {/* Sağ: Sistem Promptu (readonly) + Embed Kodu */}
        <div className="space-y-4">
          <Card className="shadow-none border-zinc-200">
            <CardHeader className="px-5 pt-4 pb-3">
              <CardTitle className="text-[13px] font-semibold text-zinc-900">
                Sistem Promptu
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Textarea
                value={selected?.systemPrompt ?? ""}
                readOnly
                className="min-h-[160px] text-[12px] font-mono bg-zinc-50 text-zinc-500 resize-none"
              />
              <p className="mt-1.5 text-[11px] text-zinc-400">
                Bu alan yalnızca görüntülenebilir, yönetici tarafından güncellenir.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none border-zinc-200">
            <CardHeader className="px-5 pt-4 pb-3">
              <CardTitle className="text-[13px] font-semibold text-zinc-900">
                Embed Kodu
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <p className="text-[12px] text-zinc-500">
                Aşağıdaki kodu sitenizin{" "}
                <code className="rounded bg-zinc-100 px-1 text-[11px]">&lt;/body&gt;</code>
                {" "}etiketi öncesine ekleyin.
              </p>
              <div className="relative">
                <Textarea
                  value={embedCode}
                  readOnly
                  className="min-h-[60px] text-[11px] font-mono bg-zinc-50 text-zinc-600 resize-none pr-20"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2 h-7 text-[11px]"
                  onClick={() => {
                    copyToClipboard(embedCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Token:</span>
                <code className="text-[11px] text-zinc-600 font-mono">
                  {selected?.token ?? "—"}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
