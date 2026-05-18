"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function CustomerActions({
  customerId,
  isActive,
  plan,
}: {
  customerId: string;
  isActive: boolean;
  plan: string;
}) {
  const router = useRouter();
  const [planOpen, setPlanOpen]     = useState(false);
  const [pwOpen, setPwOpen]         = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(plan);
  const [loading, setLoading]       = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied]         = useState(false);

  async function patch(data: Record<string, unknown>) {
    setLoading(true);
    await fetch(`/api/admin/customers/${customerId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) return;
    setLoading(true);
    await fetch(`/api/admin/customers/${customerId}`, { method: "DELETE" });
    router.push("/admin/customers");
  }

  async function handleResetPassword() {
    setLoading(true);
    setNewPassword("");
    const res  = await fetch(`/api/admin/customers/${customerId}/reset-password`, { method: "POST" });
    const data = await res.json() as { tempPassword?: string; error?: string };
    setLoading(false);
    if (data.tempPassword) setNewPassword(data.tempPassword);
  }

  function copyPassword() {
    navigator.clipboard.writeText(newPassword).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      {/* Şifre Sıfırla */}
      <Dialog open={pwOpen} onOpenChange={(v) => { setPwOpen(v); if (!v) { setNewPassword(""); setCopied(false); } }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-[12px]">
            Şifre Sıfırla
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Şifre Sıfırla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {newPassword ? (
              <>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <p className="text-[11px] text-emerald-600 mb-1">Yeni geçici şifre:</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[14px] font-mono font-medium text-zinc-900">
                      {newPassword}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] shrink-0"
                      onClick={copyPassword}
                    >
                      {copied ? "Kopyalandı!" : "Kopyala"}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Müşteri bir sonraki girişinde bu şifreyle giriş yapabilir.
                </p>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={() => { setPwOpen(false); setNewPassword(""); setCopied(false); }}
                  >
                    Kapat
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[12px] text-zinc-600">
                  Yeni bir geçici şifre oluşturulacak ve mevcut şifre devre dışı kalacak.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost" size="sm" className="h-8 text-[12px]"
                    onClick={() => setPwOpen(false)}
                  >
                    İptal
                  </Button>
                  <Button
                    size="sm" className="h-8 text-[12px]"
                    disabled={loading}
                    onClick={handleResetPassword}
                  >
                    {loading ? "Oluşturuluyor..." : "Şifre Oluştur"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Değiştir */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-[12px]">
            Plan Değiştir
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Plan Değiştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="PRO">Pro</SelectItem>
                <SelectItem value="AGENCY">Agency</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost" size="sm" className="h-8 text-[12px]"
                onClick={() => setPlanOpen(false)}
              >
                İptal
              </Button>
              <Button
                size="sm" className="h-8 text-[12px]"
                disabled={loading}
                onClick={async () => { await patch({ plan: selectedPlan }); setPlanOpen(false); }}
              >
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Aktif / Pasif */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-[12px]"
        disabled={loading}
        onClick={() => patch({ isActive: !isActive })}
      >
        {isActive ? "Pasif Et" : "Aktif Et"}
      </Button>

      {/* Sil */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-[12px] text-red-500 hover:text-red-600 hover:bg-red-50"
        disabled={loading}
        onClick={handleDelete}
      >
        Sil
      </Button>
    </div>
  );
}
