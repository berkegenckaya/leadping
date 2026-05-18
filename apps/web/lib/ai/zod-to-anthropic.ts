import { z } from "zod";

// Zod schema'yı Anthropic'in input_schema formatına dönüştürür
// Desteklenen tipler: string, number, boolean, enum, optional, object, record
export function zodToAnthropicTool(schema: z.ZodSchema): { type: "object"; properties?: unknown; required?: string[]; [k: string]: unknown } {
  return {
    type:       "object",
    properties: zodObjectToProperties(schema),
    required:   zodObjectToRequired(schema),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodTypeToJsonSchema(zodType: z.ZodTypeAny): Record<string, any> {
  if (zodType instanceof z.ZodString) {
    const s: Record<string, string> = { type: "string" };
    if (zodType.description) s["description"] = zodType.description;
    return s;
  }
  if (zodType instanceof z.ZodNumber) {
    return { type: "number", ...(zodType.description ? { description: zodType.description } : {}) };
  }
  if (zodType instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (zodType instanceof z.ZodEnum) {
    return { type: "string", enum: zodType.options as string[] };
  }
  if (zodType instanceof z.ZodOptional || zodType instanceof z.ZodNullable) {
    const inner = zodTypeToJsonSchema(zodType.unwrap());
    return zodType.description ? { ...inner, description: zodType.description } : inner;
  }
  if (zodType instanceof z.ZodObject) {
    return {
      type:       "object",
      properties: zodObjectToProperties(zodType),
      required:   zodObjectToRequired(zodType),
    };
  }
  if (zodType instanceof z.ZodRecord) {
    return { type: "object", additionalProperties: true };
  }
  if (zodType instanceof z.ZodArray) {
    return { type: "array", items: zodTypeToJsonSchema(zodType.element) };
  }
  if (zodType instanceof z.ZodUnknown || zodType instanceof z.ZodAny) {
    return {};
  }
  return { type: "string" }; // fallback
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodObjectToProperties(schema: z.ZodSchema): Record<string, any> {
  if (!(schema instanceof z.ZodObject)) return {};
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const props: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(shape)) {
    props[key] = zodTypeToJsonSchema(val);
  }
  return props;
}

function zodObjectToRequired(schema: z.ZodSchema): string[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  return Object.entries(shape)
    .filter(([, val]) => !(val instanceof z.ZodOptional) && !(val instanceof z.ZodNullable))
    .map(([key]) => key);
}
