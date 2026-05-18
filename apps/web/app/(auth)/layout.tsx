import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-white">
      {/* Sol üst logo */}
      <div className="absolute left-8 top-6 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900">
          <span className="text-xs font-bold text-white">LP</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          LeadPing
        </span>
      </div>

      {/* Ortalanmış içerik */}
      <div className="flex min-h-screen items-center justify-center px-4 py-20">
        {children}
      </div>
    </div>
  );
}
