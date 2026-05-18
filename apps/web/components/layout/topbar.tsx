"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarContent, type SidebarUser } from "@/components/layout/sidebar";

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

// ─── Pathname → sayfa başlığı eşlemesi ───────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":                  "Dashboard",
  "/dashboard/leads":            "Leads",
  "/dashboard/widgets":          "Widget'lar",
  "/dashboard/notifications":    "Bildirimler",
  "/dashboard/settings":         "Genel Ayarlar",
  "/dashboard/settings/plan":    "Plan",
};

function usePageTitle(): string {
  const pathname = usePathname();
  // Önce tam eşleşme; yoksa en uzun prefix
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]!;
  const match = Object.keys(PAGE_TITLES)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match]! : "Dashboard";
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar({ user }: { user: SidebarUser }) {
  const title = usePageTitle();

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4"
      style={{ borderBottomWidth: "0.5px" }}
    >
      {/* Sol: hamburger (mobile) + sayfa başlığı */}
      <div className="flex items-center gap-3">
        {/* Mobile sheet trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-4 w-4 text-zinc-500" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[200px] p-0">
            <SidebarContent user={user} />
          </SheetContent>
        </Sheet>

        <h1 className="text-[13px] font-medium text-zinc-900">{title}</h1>
      </div>

      {/* Sağ: bildirim + avatar dropdown */}
      <div className="flex items-center gap-0.5">
        {/* Bildirim */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Bildirimler"
          asChild
        >
          <Link href="/dashboard/notifications">
            <Bell className="h-[15px] w-[15px] text-zinc-500" />
          </Link>
        </Button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              aria-label="Hesap menüsü"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-zinc-200 text-[10px] font-medium text-zinc-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            {/* Kullanıcı bilgisi */}
            <div className="px-2 py-2">
              <p className="text-[12px] font-medium text-zinc-900 truncate">
                {user.fullName}
              </p>
              <p className="text-[11px] text-zinc-400">
                {user.role === "ADMIN" ? "Yönetici" : "Üye"}
              </p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 text-[13px]"
              >
                <Settings className="h-3.5 w-3.5" />
                Ayarlar
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center gap-2 text-[13px] text-red-500 focus:text-red-500 cursor-pointer"
              onSelect={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Çıkış yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
