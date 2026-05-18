import { NextRequest } from "next/server";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, StreamData } from "ai";
import { getActiveTools } from "@leadping/skills";

// ─── Rate Limit (in-memory, per sessionId) ────────────────────────────────────

interface RateBucket { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateBucket>();

function isRateLimited(sessionId: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (entry.count >= 20) return true;
  entry.count++;
  return false;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const BodySchema = z.object({
  token:     z.string(),
  sessionId: z.string().optional(),
  messages:  z.array(
    z.object({
      role:    z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).min(1),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {                                                        
    "Access-Control-Allow-Origin": "*",                                         
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",                             
  };  

  export async function OPTIONS() {                                             
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  } 

export async function POST(request: NextRequest) {
  // 1. Parse body
  let body: unknown;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "Geçersiz JSON." }), { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Geçersiz istek." }), { status: 400 });
  }

  const { token, sessionId, messages } = parsed.data;

  // 2. Widget'ı bul
  const { prisma } = await import("@/lib/db");

  const widget = await prisma.widget.findUnique({
    where:  { token },
    select: {
      id: true, tenantId: true, systemPrompt: true,
      maxTurns: true, skillsConfig: true, isActive: true,
      allowedDomain: true, sector: true,
    },
  });

  if (!widget)          return new Response(JSON.stringify({ error: "Widget bulunamadı." }),  { status: 404 });
  if (!widget.isActive) return new Response(JSON.stringify({ error: "Widget aktif değil." }), { status: 403 });

  // 3. Origin / allowedDomain kontrolü
  const origin = request.headers.get("origin") ?? "";
  if (origin && widget.allowedDomain && process.env.NODE_ENV === "production") {
    try {
      const hostname = new URL(origin).hostname.replace(/^www\./, "");
      const allowed  = widget.allowedDomain.replace(/^www\./, "");
      if (hostname !== allowed) {
        return new Response(JSON.stringify({ error: "İzin verilmeyen domain." }), { status: 403 });
      }
    } catch {
      // origin parse edilemiyorsa geç
    }
  }

  // 4. Rate limit
  const session = sessionId ?? token;
  if (isRateLimited(session)) {
    return new Response(JSON.stringify({ error: "Çok fazla mesaj. Lütfen bekleyin." }), { status: 429 });
  }

  // 5. Aktif skill'leri al
  const skillsConfig = (widget.skillsConfig as Record<string, unknown>) ?? {};
  const tools = getActiveTools(skillsConfig, {
    widgetId:  widget.id,
    tenantId:  widget.tenantId,
    sessionId: session,
  });

  // 6. streamText
  try {
    const openai = createOpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

    const streamData = new StreamData();

    const basePrompt = widget.systemPrompt ?? "";

    const sectorGuide: Record<string, string> = {
      HUKUK:   "sectorData olarak dava türünü (davaType) kaydet. Örnek: 'Boşanma', 'İş Kazası', 'Kira Uyuşmazlığı'.",
      EMLAK:   "sectorData olarak bütçeyi (budget) ve bölgeyi (location) kaydet. Örnek: budget: '3.5M TL', location: 'İstanbul / Kadıköy'.",
      SIGORTA: "sectorData olarak poliçe türünü (policyType) kaydet. Örnek: 'Kasko', 'Konut', 'Sağlık'.",
      SAGLIK:  "sectorData olarak şikayet tipini (complaintType) kaydet. Örnek: 'Ortopedi', 'Genel Muayene', 'Diş'.",
    };

    const sector     = widget.sector ?? "";
    const sectorHint = sectorGuide[sector] ?? "sectorData olarak konuyla ilgili temel bilgiyi kaydet.";

    const systemPrompt = `${basePrompt}

## Rol
Samimi ve yardımsever bir ön görüşme asistanısın. Kullanıcının sorularını yanıtlar, konuyla ilgili kısa bilgi verirsin. Aynı zamanda doğal sohbet akışında üç bilgiyi toplamaya çalışırsın:
1. İsim soyisim
2. Telefon veya e-posta (biri yeterli)
3. Temel talep / konu

## Bilgi toplama yaklaşımı
- Bilgileri zorla değil, sohbet içinde doğal şekilde sor
- Kullanıcı soru sorarsa önce yanıtla, ardından eksik bilgiyi nazikçe iste
- Hem telefon hem e-posta isteme — biri yeterli
- Üç bilginin hepsine sahip olunca collectLeadInfo'yu çağır ve sohbete devam et

## collectLeadInfo tetik koşulu
İsim + iletişim + konu bilgilerinin tamamı elindeaysa, kullanıcının bir sonraki mesajını beklemeden aynı yanıtta collectLeadInfo'yu çağır.

## Sektör notu
${sectorHint}
Bu veriyi kullanıcının söylediklerinden çıkar, ayrıca sormana gerek yok.

score: konuşmanın netliğine ve aciliyetine göre 1-10 ver. Ekibimiz detayları sonra alır.`;

    const result = await streamText({
      model:    openai("gpt-4o-mini"),
      system:   systemPrompt,
      messages,
      maxSteps: Math.min(widget.maxTurns, 10),
      tools,
      onStepFinish: ({ toolResults }) => {
        for (const tr of toolResults as Array<{ toolName: string; result: unknown; args: unknown }>) {
          if (tr.toolName === "collectLeadInfo" && (tr.result as { success?: boolean })?.success) {
            streamData.appendMessageAnnotation({ type: "leadCollected", data: tr.args });
          }
        }
      },
      onFinish: async ({ text }) => {
        streamData.close();
        try {
          const fullMessages = [
            ...messages,
            ...(text ? [{ role: "assistant" as const, content: text }] : []),
          ];

          const existing = await prisma.conversation.findUnique({
            where:  { sessionId: session },
            select: { createdAt: true },
          });

          const durationSeconds = existing
            ? Math.floor((Date.now() - existing.createdAt.getTime()) / 1000)
            : 0;

          await prisma.conversation.upsert({
            where:  { sessionId: session },
            create: {
              sessionId: session,
              widgetId:  widget.id,
              tenantId:  widget.tenantId,
              messages:  fullMessages as never,
              durationSeconds: 0,
            },
            update: {
              messages: fullMessages as never,
              durationSeconds,
            },
          });
        } catch (e) {
          console.error("[chat] conversation upsert error:", e);
        }
      },
    });

    return result.toDataStreamResponse({
      headers: CORS_HEADERS,
      data: streamData,
      getErrorMessage: (error) => {
        console.error("[chat] tool/stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (err) {
    console.error("[POST /api/widget/chat] streamText error:", err);
    return new Response(JSON.stringify({ error: "AI servisi hatası." }), { status: 500 });
  }
}
