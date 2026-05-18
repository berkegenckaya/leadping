"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Code2,
  Bell,
  Settings,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

// ─── Nav tanımları ────────────────────────────────────────────────────────────

const NAV_MAIN: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard",   href: "/dashboard",               icon: LayoutDashboard },
  { label: "Leads",       href: "/dashboard/leads",         icon: Users           },
  { label: "Widget'lar",  href: "/dashboard/widgets",       icon: Code2           },
  { label: "Bildirimler", href: "/dashboard/notifications", icon: Bell            },
];

const NAV_SETTINGS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Genel", href: "/dashboard/settings",       icon: Settings    },
  { label: "Plan",  href: "/dashboard/settings/plan",  icon: CreditCard  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SidebarUser {
  fullName: string;
  role: "ADMIN" | "MEMBER";
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm transition-colors",
        isActive
          ? "bg-zinc-100 font-medium text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0" />
      {label}
    </Link>
  );
}

// ─── SidebarContent (paylaşımlı — desktop + mobile sheet) ────────────────────

export function SidebarContent({ user }: { user: SidebarUser }) {
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 px-4">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-zinc-900">
          <span className="text-[9px] font-bold leading-none text-white">LP</span>
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
          LeadPing
        </span>
      </div>

      <Separator />

      {/* Ana nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Ayarlar grubu */}
      <div className="px-2 pb-2">
        <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Ayarlar
        </p>
        <div className="space-y-0.5">
          {NAV_SETTINGS.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </div>

      <Separator />

      {/* Kullanıcı + Logout */}
      <div className="shrink-0 p-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-zinc-200 text-[10px] font-medium text-zinc-600">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium leading-tight text-zinc-900">
              {user.fullName}
            </p>
            <p className="text-[11px] leading-tight text-zinc-400">
              {user.role === "ADMIN" ? "Yönetici" : "Üye"}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mt-0.5 h-7 w-full justify-start px-2.5 text-[12px] text-zinc-400 hover:text-zinc-700"
        >
          Çıkış yap
        </Button>
      </div>
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

export function Sidebar({ user }: { user: SidebarUser }) {
  return (
    <aside
      className="hidden h-screen w-[200px] shrink-0 border-r border-zinc-200 lg:block"
      style={{ borderRightWidth: "0.5px" }}
    >
      <SidebarContent user={user} />
    </aside>
  );
}
