import { z } from "zod";
import { tool } from "ai";
import type { Skill } from "../types";

export const calendlySkill: Skill = {
  id:          "calendly",
  name:        "Calendly Randevu",
  description: "Kullanıcıya Calendly üzerinden randevu alma linki sunar.",
  alwaysOn:    false,
  configSchema: z.object({
    url: z.string().url("Geçerli bir Calendly URL'si girin"),
  }),

  toolDefinition: (config: { url?: string; [k: string]: unknown }) =>
    tool({
      description: "Randevu için Calendly linki sun",
      parameters: z.object({
        reason: z.string().describe("AI neden randevu teklif ettiğini yazar"),
      }),

      // Widget bu action'ı alınca Calendly embed açar
      execute: async (_args) => {
        return { action: "OPEN_CALENDLY", url: config.url ?? "" };
      },
    }),
};
