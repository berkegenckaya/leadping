import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ERROR_MAP: Record<string, string> = {
  user_already_exists:        "Bu e-posta adresi zaten kayıtlı.",
  email_address_invalid:      "Geçersiz e-posta adresi.",
  weak_password:              "Şifre en az 6 karakter olmalı.",
  over_email_send_rate_limit: "Çok fazla deneme. Lütfen bekleyin.",
};

function toSlug(name: string): string {
  const tr: Record<string, string> = {
    ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c",
    İ: "i", Ş: "s", Ğ: "g", Ü: "u", Ö: "o", Ç: "c",
  };
  return name.split("").map((c) => tr[c] ?? c).join("")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, companyName, sector } =
      (await request.json()) as {
        email: string;
        password: string;
        fullName: string;
        companyName: string;
        sector: string;
      };

    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      const msg = ERROR_MAP[signUpError.code ?? ""] ?? "Beklenmedik bir hata oluştu.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const user = data.user;
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı oluşturulamadı." }, { status: 500 });
    }

    try {
      const { prisma } = await import("@/lib/db");
      const baseSlug = toSlug(companyName);
      const existing = await prisma.tenant.findUnique({ where: { slug: baseSlug } });
      const slug = existing
        ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
        : baseSlug;

      const tenant = await prisma.tenant.create({
        data: { name: companyName, slug, sector: sector as any, plan: "FREE" },
      });
      await prisma.profile.create({
        data: { tenantId: tenant.id, supabaseAuthId: user.id, role: "ADMIN", fullName },
      });
    } catch {
      return NextResponse.json(
        { error: "Hesap kurulumu tamamlanamadı. Lütfen destek ekibiyle iletişime geçin." },
        { status: 500 }
      );
    }

    return response;
  } catch (err) {
    console.error("[/api/auth/register]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
