"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Code2,
  MessageSquare,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const NAV: { label: string; href: string; icon: LucideIcon; exact?: boolean }[] = [
  { label: "Genel Bakış",  href: "/admin",                icon: LayoutDashboard, exact: true },
  { label: "Müşteriler",   href: "/admin/customers",      icon: Building2 },
  { label: "Widget'lar",   href: "/admin/widgets",        icon: Code2 },
  { label: "Konuşmalar",   href: "/admin/conversations",  icon: MessageSquare },
  { label: "Ayarlar",      href: "/admin/settings",       icon: Settings },
];

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

function NavItem({
  href,
  icon: Icon,
  label,
  exact,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors",
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

export function AdminSidebar() {
  return (
    <aside
      className="hidden h-screen w-[200px] shrink-0 border-r border-zinc-200 lg:flex lg:flex-col bg-white"
      style={{ borderRightWidth: "0.5px" }}
    >
      {/* Logo */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 px-4">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-zinc-900">
          <span className="text-[9px] font-bold leading-none text-white">LP</span>
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
          LeadPing
        </span>
        <span className="ml-auto rounded-[4px] bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600">
          Admin
        </span>
      </div>

      <Separator />

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <Separator />

      {/* Alt: Super Admin + Logout */}
      <div className="shrink-0 px-3 py-3 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
            <span className="text-[9px] font-bold text-red-600">SA</span>
          </div>
          <span className="text-[12px] font-medium text-zinc-700">Super Admin</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Çıkış yap
        </button>
      </div>
    </aside>
  );
}
