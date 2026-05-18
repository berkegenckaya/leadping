import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { SidebarUser } from "@/components/layout/sidebar";

async function getProfile(supabaseAuthId: string): Promise<{ fullName: string; role: "ADMIN" | "MEMBER" | "SUPER_ADMIN" } | null> {
  try {
    // DATABASE_URL yoksa import sırasında patlamasın diye dinamik import
    const { prisma } = await import("@/lib/db");
    return await prisma.profile.findUnique({
      where:  { supabaseAuthId },
      select: { fullName: true, role: true },
    });
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile(user.id);

  const userData: SidebarUser = {
    fullName:
      profile?.fullName ??
      (user.user_metadata?.["full_name"] as string | undefined) ??
      user.email ??
      "Kullanıcı",
    role: (profile?.role ?? "MEMBER") as "ADMIN" | "MEMBER",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar user={userData} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={userData} />
        <main className="flex-1 overflow-auto bg-zinc-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
