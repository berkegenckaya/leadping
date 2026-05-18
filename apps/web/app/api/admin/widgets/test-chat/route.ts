import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/auth";
import Anthropic from "@anthropic-ai/sdk";

const ChatSchema = z.object({
  systemPrompt: z.string().min(1),
  messages: z.array(
    z.object({
      role:    z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireSuperAdmin(request);
    if (error) return error;

    const body   = await request.json();
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { systemPrompt, messages } = parsed.data;

    const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:     systemPrompt,
      messages,
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error("[POST /api/admin/widgets/test-chat]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
