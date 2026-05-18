"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sector enum değerleri — Prisma client'ı client bundle'a dahil etmemek için
// burada tanımlanır; packages/types ile birebir eşleşir.
const SECTORS = [
  { value: "HUKUK",   label: "Hukuk" },
  { value: "EMLAK",   label: "Emlak" },
  { value: "SIGORTA", label: "Sigorta" },
  { value: "SAGLIK",  label: "Sağlık" },
] as const;

type SectorValue = (typeof SECTORS)[number]["value"];

const schema = z
  .object({
    fullName:        z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
    companyName:     z.string().min(2, "Şirket adı en az 2 karakter olmalı"),
    sector:          z.enum(["HUKUK", "EMLAK", "SIGORTA", "SAGLIK"], {
                       required_error: "Sektör seçin",
                     }),
    email:           z.string().email("Geçerli bir e-posta adresi girin"),
    password:        z.string().min(8, "Şifre en az 8 karakter olmalı"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path:    ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName:        "",
      companyName:     "",
      sector:          undefined,
      email:           "",
      password:        "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const res = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(values),
    });

    const data = await res.json() as { ok?: boolean; error?: string };

    if (!res.ok || data.error) {
      setServerError(data.error ?? "Kayıt başarısız.");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="w-full max-w-sm">
      {/* Kart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-900">Hesap oluştur</h1>
          <p className="mt-1 text-sm text-zinc-500">
            LeadPing'e katılmak için bilgilerinizi girin
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Ad Soyad */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Soyad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ahmet Yılmaz" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Şirket Adı + Sektör yan yana */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şirket Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Hukuk AŞ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sektör</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                          "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
                          "focus-visible:ring-ring focus-visible:ring-offset-2",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <option value="" disabled hidden>Seçin</option>
                        {SECTORS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* E-posta */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="siz@sirket.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Şifre */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="En az 8 karakter"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Şifre Tekrarı */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre Tekrarı</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <div className="rounded-md bg-red-50 px-3 py-2">
                <p className="text-sm text-red-600">{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
            </Button>
          </form>
        </Form>
      </div>

      {/* Alt link */}
      <p className="mt-5 text-center text-sm text-zinc-500">
        Zaten hesabınız var mı?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
