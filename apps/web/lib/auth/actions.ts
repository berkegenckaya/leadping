"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Sector = "HUKUK" | "EMLAK" | "SIGORTA" | "SAGLIK";
type Plan   = "FREE" | "PRO" | "AGENCY";

export type ActionResult =
  | { error: string }
  | { redirectTo: string };

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function authError(code: string | undefined): string {
  const map: Record<string, string> = {
    invalid_credentials:        "E-posta veya şifre hatalı.",
    email_not_confirmed:        "E-posta adresinizi doğrulayın ve tekrar deneyin.",
    user_already_exists:        "Bu e-posta adresi zaten kayıtlı.",
    email_address_invalid:      "Geçersiz e-posta adresi.",
    weak_password:              "Şifre çok zayıf — en az 6 karakter kullanın.",
    over_email_send_rate_limit: "Çok fazla deneme yaptınız. Lütfen bekleyin.",
  };
  return map[code ?? ""] ?? "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.";
}

function toSlug(name: string): string {
  const tr: Record<string, string> = {
    ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c",
    İ: "i", Ş: "s", Ğ: "g", Ü: "u", Ö: "o", Ç: "c",
  };
  return name
    .split("").map((c) => tr[c] ?? c).join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ─── login ────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: authError(error.code) };

  const role = data.user?.app_metadata?.["role"] as string | undefined;
  revalidatePath("/", "layout");
  return { redirectTo: role === "SUPER_ADMIN" ? "/admin" : "/dashboard" };
}

// ─── logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function getSession() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error ?? !user) return null;
  return user;
}

// ─── createCustomer (sadece SUPER_ADMIN çağırır) ──────────────────────────────

export async function createCustomer(
  email: string,
  password: string,
  fullName: string,
  companyName: string,
  sector: Sector,
  plan: Plan = "FREE"
): Promise<ActionResult> {
  // Çağıranın SUPER_ADMIN olduğunu doğrula
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.["role"] !== "SUPER_ADMIN") {
    return { error: "Bu işlem için yetkiniz yok." };
  }

  const adminClient = createAdminClient();

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Kullanıcı oluşturulamadı." };

  try {
    const { prisma } = await import("@/lib/db");
    const baseSlug = toSlug(companyName);
    const existing = await prisma.tenant.findUnique({ where: { slug: baseSlug } });
    const slug     = existing ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;

    const tenant = await prisma.tenant.create({
      data: { name: companyName, slug, sector, plan },
    });

    await prisma.profile.create({
      data: {
        tenantId:       tenant.id,
        supabaseAuthId: authData.user.id,
        role:           "ADMIN",
        fullName,
      },
    });
  } catch {
    // Auth user oluşturuldu ama DB yazımı başarısız — hata gönder
    await adminClient.auth.admin.deleteUser(authData.user.id).catch(() => null);
    return { error: "Hesap kurulumu tamamlanamadı." };
  }

  // Hoş geldin emaili
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env["RESEND_API_KEY"]);
    await resend.emails.send({
      from:    "LeadPing <noreply@leadping.co>",
      to:      email,
      subject: "LeadPing'e Hoş Geldiniz",
      html: `
        <h2>Merhaba ${fullName},</h2>
        <p>LeadPing hesabınız oluşturuldu.</p>
        <p><strong>E-posta:</strong> ${email}<br/>
           <strong>Şifre:</strong> ${password}</p>
        <a href="${process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"}/login">Giriş Yap →</a>
      `,
    });
  } catch (e) {
    console.warn("[createCustomer] email gönderilemedi:", e);
  }

  return { redirectTo: "/admin/customers" };
}
