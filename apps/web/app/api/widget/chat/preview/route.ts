import { NextRequest } from "next/server";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getActiveTools } from "@leadping/skills";
import { requireSuperAdmin } from "@/lib/admin/auth";

const BodySchema = z.object({
  systemPrompt:  z.string().min(1),
  skillsConfig:  z.record(z.unknown()).optional(),
  messages:      z.array(
    z.object({
      role:    z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  // Sadece super admin kullanır
  const { error } = await requireSuperAdmin(request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "Geçersiz JSON." }), { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Geçersiz istek." }), { status: 400 });
  }

  const { systemPrompt, skillsConfig = {}, messages } = parsed.data;

  // dryRun: true → lead/conversation kaydetme yok
  const tools = getActiveTools(skillsConfig as Record<string, unknown>, {
    widgetId: "preview",
    tenantId: "preview",
    dryRun:   true,
  });

  const openai = createOpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

  const result = await streamText({
    model:    openai("gpt-4o-mini"),
    system:   systemPrompt,
    messages,
    maxSteps: 5,
    tools,
  });

  return result.toDataStreamResponse();
}
