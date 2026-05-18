import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ERROR_MAP: Record<string, string> = {
  invalid_credentials:        "E-posta veya şifre hatalı.",
  email_not_confirmed:        "E-posta adresinizi doğrulayın.",
  user_already_exists:        "Bu e-posta adresi zaten kayıtlı.",
  email_address_invalid:      "Geçersiz e-posta adresi.",
  weak_password:              "Şifre en az 6 karakter olmalı.",
  over_email_send_rate_limit: "Çok fazla deneme. Lütfen bekleyin.",
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = ERROR_MAP[error.code ?? ""] ?? "Beklenmedik bir hata oluştu.";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const role = data.user?.app_metadata?.["role"] as string | undefined;
    const redirectTo = role === "SUPER_ADMIN" ? "/admin" : "/dashboard";

    return NextResponse.json({ ok: true, redirectTo }, {
      headers: response.headers,
    });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
