"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Tenant { id: string; name: string }

export function WidgetRowActions({
  widgetId,
  tenants,
}: {
  widgetId: string;
  tenants: Tenant[];
}) {
  const router = useRouter();
  const [busy, setBusy]           = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function handleDelete() {
    if (!confirm("Bu widget'ı silmek istediğinizden emin misiniz?")) return;
    setBusy(true);
    await fetch(`/api/admin/widgets/${widgetId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleAssign() {
    if (!selectedTenant) return;
    setAssigning(true);
    await fetch(`/api/admin/widgets/${widgetId}/assign`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ tenantId: selectedTenant }),
    });
    setAssigning(false);
    setAssignOpen(false);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={busy}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40 text-[12px]">
          <DropdownMenuItem asChild className="text-[12px]">
            <Link href={`/admin/widgets/${widgetId}/edit`}>Düzenle</Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-[12px]"
            onClick={() => { setSelectedTenant(""); setAssignOpen(true); }}
          >
            Müşteriye Ata
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-[12px] text-red-500 focus:text-red-600 focus:bg-red-50"
            onClick={handleDelete}
          >
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Müşteriye Ata Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Müşteriye Ata</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Müşteri</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Müşteri seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => setAssignOpen(false)}
              >
                İptal
              </Button>
              <Button
                size="sm"
                className="h-8 text-[12px]"
                disabled={!selectedTenant || assigning}
                onClick={handleAssign}
              >
                {assigning ? "Atanıyor..." : "Ata"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
