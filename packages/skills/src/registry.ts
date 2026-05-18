import type { CoreTool } from "ai";
import type { Skill, SkillContext } from "./types";
import { collectLeadInfoSkill } from "./skills/collectLeadInfo";
import { calendlySkill }        from "./skills/calendly";

export const skillRegistry = new Map<string, Skill>([
  [collectLeadInfoSkill.id, collectLeadInfoSkill],
  [calendlySkill.id,        calendlySkill],
]);

/**
 * Widget'a ait aktif tool'ları döner.
 * Context (widgetId, tenantId, dryRun) config.__context üzerinden inject edilir;
 * her skill'in execute fonksiyonu buna closure ile erişir.
 */
export function getActiveTools(
  skillsConfig: Record<string, unknown>,
  context: SkillContext
): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {};

  for (const [id, skill] of skillRegistry) {
    const cfg      = (skillsConfig[id] ?? {}) as Record<string, unknown>;
    const isActive = skill.alwaysOn || cfg["enabled"] === true;
    if (!isActive) continue;

    const parsed        = skill.configSchema.safeParse(cfg);
    const resolvedConfig = parsed.success ? parsed.data : cfg;

    tools[id] = skill.toolDefinition({ ...resolvedConfig, __context: context });
  }

  return tools;
}

export function getAllSkillMeta() {
  return Array.from(skillRegistry.values()).map((s) => ({
    id:           s.id,
    name:         s.name,
    description:  s.description,
    alwaysOn:     s.alwaysOn,
    configSchema: s.configSchema,
  }));
}
