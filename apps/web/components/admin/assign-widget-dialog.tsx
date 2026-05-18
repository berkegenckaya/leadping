"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface AvailableWidget {
  id: string;
  name: string;
  sector: string;
  isActive: boolean;
  tenant: { id: string; name: string } | null;
  leadCount: number;
}

const SECTOR_LABEL: Record<string, string> = {
  HUKUK: "Hukuk", EMLAK: "Emlak", SIGORTA: "Sigorta", SAGLIK: "Sağlık",
};

export function AssignWidgetDialog({
  customerId,
  assignedWidgetIds,
}: {
  customerId: string;
  assignedWidgetIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [widgets, setWidgets]     = useState<AvailableWidget[]>([]);
  const [selected, setSelected]   = useState<string>("");
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(false);
  const [error, setError]         = useState("");

  async function onOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) { setSelected(""); setError(""); return; }

    setFetching(true);
    try {
      const res  = await fetch("/api/admin/widgets");
      const data = await res.json() as AvailableWidget[];
      // Bu müşteriye zaten atanmış widgetları çıkar
      setWidgets(data.filter((w) => !assignedWidgetIds.includes(w.id)));
    } finally {
      setFetching(false);
    }
  }

  async function handleAssign() {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/widgets/${selected}/assign`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tenantId: customerId }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Bir hata oluştu.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-[11px]">
          + Widget Ata
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Widget Ata</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {fetching ? (
            <p className="text-[12px] text-zinc-400 py-4 text-center">
              Yükleniyor...
            </p>
          ) : widgets.length === 0 ? (
            <p className="text-[12px] text-zinc-400 py-4 text-center">
              Atanabilecek widget bulunamadı.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {widgets.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelected(w.id)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected === w.id
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-[13px] font-medium truncate ${selected === w.id ? "text-white" : "text-zinc-900"}`}>
                      {w.name}
                    </p>
                    {w.tenant && (
                      <p className={`text-[11px] truncate ${selected === w.id ? "text-zinc-300" : "text-zinc-400"}`}>
                        Şu an: {w.tenant.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${selected === w.id ? "border-zinc-600 text-zinc-200" : "border-zinc-200 text-zinc-500"}`}
                    >
                      {SECTOR_LABEL[w.sector] ?? w.sector}
                    </Badge>
                    <span className={`text-[11px] ${selected === w.id ? "text-zinc-300" : "text-zinc-400"}`}>
                      {w.leadCount} lead
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-[12px]"
              onClick={() => setOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-[12px]"
              disabled={!selected || loading}
              onClick={handleAssign}
            >
              {loading ? "Atanıyor..." : "Widget'ı Ata"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
