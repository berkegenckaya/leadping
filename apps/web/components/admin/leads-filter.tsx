"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function AdminLeadsFilter() {
  const router     = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/admin/leads?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/admin/leads");
  }

  const hasFilters = searchParams.get("urgency") || searchParams.get("status");

  return (
    <div className="flex items-center gap-2">
      <Select
        value={searchParams.get("urgency") ?? "ALL"}
        onValueChange={(v) => update("urgency", v)}
      >
        <SelectTrigger className="h-8 w-[120px] text-[12px]">
          <SelectValue placeholder="Aciliyet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tüm Aciliyet</SelectItem>
          <SelectItem value="LOW">Düşük</SelectItem>
          <SelectItem value="MED">Orta</SelectItem>
          <SelectItem value="HIGH">Yüksek</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? "ALL"}
        onValueChange={(v) => update("status", v)}
      >
        <SelectTrigger className="h-8 w-[130px] text-[12px]">
          <SelectValue placeholder="Durum" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tüm Durum</SelectItem>
          <SelectItem value="NEW">Yeni</SelectItem>
          <SelectItem value="CONTACTED">İletişime Geçildi</SelectItem>
          <SelectItem value="CONVERTED">Dönüştürüldü</SelectItem>
          <SelectItem value="LOST">Kaybedildi</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[12px] text-zinc-400"
          onClick={clearFilters}
        >
          Temizle
        </Button>
      )}
    </div>
  );
}
