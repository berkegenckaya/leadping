import { z } from "zod";
import { tool } from "ai";
import type { Prisma } from "@prisma/client";
import type { Skill, SkillContext } from "../types";

export const collectLeadInfoSkill: Skill = {
  id:          "collectLeadInfo",
  name:        "Lead Toplama",
  description: "Görüşme bitiminde kullanıcı bilgilerini otomatik olarak kaydeder.",
  alwaysOn:    true,
  configSchema: z.object({}),

  toolDefinition: (config: { __context?: SkillContext; [k: string]: unknown }) =>
    tool({
      description: "Kullanıcının adı, iletişim bilgisi (telefon veya e-posta) ve temel talebi öğrenildiğinde çağır. Sohbet kesilmez — tool çağrısından sonra yanıt vermeye devam et.",
      parameters: z.object({
        name:       z.string().describe("Kullanıcının tam adı"),
        email:      z.string().email().optional().describe("E-posta adresi"),
        phone:      z.string().optional().describe("Telefon numarası"),
        summary:    z.string().describe("Görüşmenin kısa özeti ve ihtiyaç analizi"),
        urgency:    z.enum(["LOW", "MED", "HIGH"]).describe("Müşteri aciliyeti"),
        score:      z.number().min(1).max(10).describe("Lead kalite skoru (1-10)"),
        sectorData: z.record(z.any()).optional().default({}).describe("Sektöre özgü ek veri (opsiyonel)"),
      }),

      execute: async (args) => {
        const { widgetId, tenantId, sessionId, dryRun } = config.__context ?? {};

        if (!widgetId || !tenantId || dryRun) {
          return { success: true, leadId: "dry-run", dryRun: true };
        }

        const { prisma } = await import("@leadping/db");

        const lead = await prisma.lead.create({
          data: {
            tenantId,
            widgetId,
            name:       args.name,
            contact:    args.email ?? args.phone ?? args.name,
            email:      args.email,
            phone:      args.phone,
            summary:    args.summary,
            urgency:    args.urgency,
            score:      args.score,
            sectorData: (args.sectorData ?? {}) as Prisma.InputJsonValue,
          },
        });

        // Mevcut conversation'ı lead'e bağla; yoksa yeni oluştur
        if (sessionId) {
          await prisma.conversation.upsert({
            where:  { sessionId },
            create: {
              sessionId,
              widgetId,
              tenantId,
              leadId:          lead.id,
              messages:        [],
              durationSeconds: 0,
            },
            update: { leadId: lead.id },
          });
        }

        // Email bildirimi kuyruğa al
        await prisma.notification.create({
          data: {
            leadId: lead.id,
            type:   "EMAIL",
            status: "PENDING",
          },
        });

        return { success: true, leadId: lead.id };
      },
    }),
};
