"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

const SECTORS = [
  { value: "HUKUK",   label: "Hukuk" },
  { value: "EMLAK",   label: "Emlak" },
  { value: "SIGORTA", label: "Sigorta" },
  { value: "SAGLIK",  label: "Sağlık" },
];

const PLANS = [
  { value: "FREE",   label: "Free" },
  { value: "PRO",    label: "Pro" },
  { value: "AGENCY", label: "Agency" },
];

const EMPTY_FORM = { companyName: "", email: "", fullName: "", sector: "", plan: "FREE" };

export function AddCustomerDialog() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied]   = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      // Kapat → sıfırla
      setCreated(null);
      setError("");
      setForm(EMPTY_FORM);
      setCopied(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.sector) { setError("Sektör seçiniz."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/admin/customers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json() as { error?: string; name?: string; tempPassword?: string };

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Bir hata oluştu.");
        return;
      }

      setCreated({
        name:     data.name ?? form.companyName,
        email:    form.email,
        password: data.tempPassword ?? "—",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function copyPassword() {
    if (!created) return;
    navigator.clipboard.writeText(created.password).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-[12px]">+ Yeni Müşteri Ekle</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            {created ? "Müşteri Oluşturuldu" : "Yeni Müşteri Ekle"}
          </DialogTitle>
        </DialogHeader>

        {created ? (
          // ─── Başarı ekranı ────────────────────────────────────────────────
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[12px] font-medium text-emerald-700">
                ✓ {created.name} başarıyla oluşturuldu.
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-600">
                Giriş bilgileri e-posta ile gönderildi.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">E-posta</p>
                  <p className="text-[13px] font-medium text-zinc-900 mt-0.5">{created.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Geçici Şifre</p>
                  <p className="text-[13px] font-mono font-medium text-zinc-900 mt-0.5">
                    {created.password}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] shrink-0 ml-2"
                  onClick={copyPassword}
                >
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              Müşteri ilk girişinde şifresini değiştirmelidir.
            </p>

            <div className="flex justify-end">
              <Button
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => handleOpenChange(false)}
              >
                Kapat
              </Button>
            </div>
          </div>
        ) : (
          // ─── Form ─────────────────────────────────────────────────────────
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-[12px]">Şirket Adı</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                placeholder="Örn: Yılmaz Hukuk Bürosu"
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-[12px]">Yetkili Adı Soyadı</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px]">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="musteri@sirket.com"
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Sektör</Label>
                <Select value={form.sector} onValueChange={(v) => setField("sector", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px]">Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setField("plan", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-[12px] text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => handleOpenChange(false)}
              >
                İptal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-[12px]"
                disabled={loading}
              >
                {loading ? "Oluşturuluyor..." : "Müşteri Oluştur"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
