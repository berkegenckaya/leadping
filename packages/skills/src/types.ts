import { z } from "zod";
import type { CoreTool } from "ai";

export interface SkillContext {
  widgetId:  string;
  tenantId:  string;
  sessionId?: string;
  dryRun?:   boolean;
}

export interface Skill {
  id:             string;
  name:           string;
  description:    string;
  alwaysOn:       boolean;
  configSchema:   z.ZodSchema;
  toolDefinition: (config: any) => CoreTool;
}
