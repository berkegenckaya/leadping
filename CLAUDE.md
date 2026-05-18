# LeadPing

## Proje
AI destekli ön görüşme widget + CRM platformu.
Turborepo monorepo.

## Apps
- apps/web     → Next.js 14 App Router (dashboard + API)
- apps/widget  → Vanilla TS + esbuild (<20kb, Shadow DOM)

## Packages
- packages/db     → Prisma schema + client (shared)
- packages/types  → Shared TypeScript types

## Tech Stack
Next.js 14 · Vercel AI SDK · OpenAI gpt-4o-mini
Supabase (Auth + DB + Realtime) · Prisma ORM
shadcn/ui Zinc · Tailwind · Resend

## Roller
- SUPER_ADMIN: ben, tüm sistemi yönetirim
- ADMIN: müşteri, kendi dashboard'unu görür
- MEMBER: müşterinin ekip üyesi

## Widget Skill Sistemi
Her skill bir Vercel AI SDK tool'udur.
packages/skills/ altında tanımlanır.
Her skill: definition (zod schema) + handler (execute fn)
Skill'ler Widget'a bağlıdır, tenant açar/kapar.

## Kodlama Kuralları
- Server component default, 'use client' sadece gerekirse
- Zod ile her input validate et
- Prisma query'leri lib/db/ altında topla
- Widget (apps/widget) React/shadcn import ETMEZ
- Her API route'u try/catch + NextResponse ile yaz
- /api/admin/* → SUPER_ADMIN kontrolü
- /api/dashboard/* → ADMIN/MEMBER kontrolü
- /api/widget/* → auth yok, token bazlı
- Türkçe UI metni, İngilizce kod

## Sektörler
hukuk | emlak | sigorta | saglik

## Env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_APP_URL