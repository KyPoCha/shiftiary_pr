import { ExtractedIntentSchema } from "../../features/text-configuration/engine/textConfigurationEngine";
import type { ExtractedTextConfigurationIntent } from "../../features/text-configuration/engine/textConfigurationEngine";

export const textConfigurationIntentJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    accountName: { type: ["string", "null"] },
    department: { type: ["string", "null"] },
    workerCount: { type: ["integer", "null"], minimum: 1, maximum: 500 },
    exportModule: { enum: ["EGJE", null] },
    maxConsecutiveNights: { type: ["integer", "null"], minimum: 1, maximum: 5 },
    shadowLoginAllowed: { type: ["boolean", "null"] },
  },
  required: [
    "accountName",
    "department",
    "workerCount",
    "exportModule",
    "maxConsecutiveNights",
    "shadowLoginAllowed",
  ],
} as const;

export function parseTextConfigurationIntent(value: unknown): ExtractedTextConfigurationIntent {
  return ExtractedIntentSchema.parse(value);
}
