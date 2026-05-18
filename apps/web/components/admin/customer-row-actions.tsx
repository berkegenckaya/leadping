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

export function CustomerRowActions({
  customerId,
  isActive,
}: {
  customerId: string;
  isActive: boolean;
}) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    await fetch(`/api/admin/customers/${customerId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !isActive }),
    });
    setBusy(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Bu müşteriyi silmek istediğinizden emin misiniz?")) return;
    setBusy(true);
    await fetch(`/api/admin/customers/${customerId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
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

      <DropdownMenuContent align="end" className="w-36 text-[12px]">
        <DropdownMenuItem asChild className="text-[12px]">
          <Link href={`/admin/customers/${customerId}`}>Detay</Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-[12px]"
          onClick={toggleActive}
        >
          {isActive ? "Pasif Et" : "Aktif Et"}
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
  );
}
