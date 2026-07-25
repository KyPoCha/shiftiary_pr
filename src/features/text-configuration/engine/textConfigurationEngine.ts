import { z } from "zod";
import type { TextConfigAnalysis, TextConfigChange, TextConfigClarification } from "../types";

export const ExtractedIntentSchema = z.object({
  accountName: z.string().nullable(),
  department: z.string().nullable(),
  workerCount: z.number().int().min(1).max(500).nullable(),
  exportModule: z.enum(["EGJE"]).nullable(),
  maxConsecutiveNights: z.number().int().min(1).max(5).nullable(),
  shadowLoginAllowed: z.boolean().nullable(),
});

export type ExtractedTextConfigurationIntent = z.infer<typeof ExtractedIntentSchema>;

export const textConfigurationExamples = [
  "JIP, 20 sester, nikdo nesmi slouzit dve nocni po sobe, export do EGJE.",
  "Motol Emergency, 35 pracovniku, zapnout EGJE export a zakazat tri nocni po sobe.",
  "Surgery, 18 lidi, povolit customer shadow login.",
  "Cardiology, export a nocni po sobe.",
];

export function analyzeTextConfiguration(input: string): TextConfigAnalysis {
  const normalizedText = normalizeText(input);
  const extractedIntent = {
    accountName: extractAccountName(input),
    department: extractDepartment(normalizedText),
    workerCount: extractWorkerCount(normalizedText),
    exportModule: extractExportModule(normalizedText),
    maxConsecutiveNights: extractMaxConsecutiveNights(normalizedText),
    shadowLoginAllowed: extractShadowLoginIntent(normalizedText),
  };

  return analyzeTextConfigurationFromIntent(input, extractedIntent, {
    extractionSource: "deterministic",
  });
}

export function analyzeTextConfigurationFromIntent(
  input: string,
  extractedIntentInput: ExtractedTextConfigurationIntent,
  metadata: Pick<TextConfigAnalysis, "extractionSource" | "extractionModel" | "fallbackReason"> = {
    extractionSource: "deterministic",
  },
): TextConfigAnalysis {
  const normalizedText = normalizeText(input);
  const extractedIntent = ExtractedIntentSchema.parse(extractedIntentInput);
  const clarifications = buildClarifications(normalizedText, extractedIntent);
  const extractionSource = metadata.extractionSource ?? "deterministic";
  const changes = buildChanges(extractedIntent, extractionSource);
  const validationMessages = validateIntent(extractedIntent, changes, clarifications);
  const blockingClarifications = clarifications.some((clarification) => clarification.blocking);

  return {
    normalizedText,
    confidence: calculateConfidence(extractedIntent, clarifications, validationMessages),
    extractedIntent,
    changes,
    clarifications,
    validationMessages,
    canApply: changes.length > 0 && !blockingClarifications && validationMessages.length === 0,
    extractionSource,
    extractionModel: metadata.extractionModel ?? null,
    fallbackReason: metadata.fallbackReason ?? null,
  };
}

function buildChanges(
  intent: ExtractedTextConfigurationIntent,
  extractionSource: NonNullable<TextConfigAnalysis["extractionSource"]>,
): TextConfigChange[] {
  const changes: TextConfigChange[] = [];
  const accountTarget = intent.accountName ?? intent.department ?? "New account";

  if (intent.department) {
    changes.push({
      id: "account-department",
      type: "account",
      title: "Set department context",
      target: accountTarget,
      before: "Not configured",
      after: intent.department,
      risk: "low",
      source: extractionSource,
    });
  }

  if (intent.workerCount) {
    changes.push({
      id: "worker-count",
      type: "workers",
      title: "Prepare worker seats",
      target: accountTarget,
      before: "0 worker placeholders",
      after: `${intent.workerCount} worker placeholders`,
      risk: intent.workerCount > 100 ? "medium" : "low",
      source: extractionSource,
    });
  }

  if (intent.exportModule === "EGJE") {
    changes.push({
      id: "feature-egje",
      type: "feature",
      title: "Enable EGJE export",
      target: "Feature toggles",
      before: "Disabled or inherited",
      after: "Enabled",
      risk: "medium",
      source: extractionSource,
    });
  }

  if (intent.maxConsecutiveNights) {
    changes.push({
      id: "rule-max-consecutive-nights",
      type: "generator-rule",
      title: "Set maximum consecutive nights",
      target: "Generator rules",
      before: "Default account rule",
      after: `${intent.maxConsecutiveNights} night${intent.maxConsecutiveNights === 1 ? "" : "s"}`,
      risk: intent.maxConsecutiveNights === 1 ? "high" : "medium",
      source: "deterministic",
    });
  }

  if (intent.shadowLoginAllowed !== null) {
    changes.push({
      id: "shadow-login-policy",
      type: "feature",
      title: `${intent.shadowLoginAllowed ? "Allow" : "Block"} customer shadow login`,
      target: "Security policy",
      before: "Current account policy",
      after: intent.shadowLoginAllowed ? "Customer admins allowed" : "Customer admins blocked",
      risk: "high",
      source: extractionSource,
    });
  }

  return changes;
}

function buildClarifications(normalizedText: string, intent: ExtractedTextConfigurationIntent): TextConfigClarification[] {
  const clarifications: TextConfigClarification[] = [];

  if (normalizedText.includes("export") && !intent.exportModule) {
    clarifications.push({
      id: "export-module",
      question: "Which export module should be enabled?",
      options: ["EGJE", "No export module", "Ask customer"],
      blocking: true,
    });
  }

  if (normalizedText.includes("nocni po sobe") && !intent.maxConsecutiveNights) {
    clarifications.push({
      id: "night-rule",
      question: "How many consecutive night shifts should be allowed?",
      options: ["Maximum 1", "Maximum 2", "Use account default"],
      blocking: true,
    });
  }

  if (!intent.department && !intent.accountName) {
    clarifications.push({
      id: "target-account",
      question: "Which account or department should receive these settings?",
      options: ["JIP", "Emergency", "Create new account"],
      blocking: true,
    });
  }

  if (intent.workerCount && intent.workerCount > 80) {
    clarifications.push({
      id: "large-worker-import",
      question: "Should workers be created as placeholders or imported from HR?",
      options: ["Create placeholders", "Import from HR", "Upload roster first"],
      blocking: false,
    });
  }

  return clarifications;
}

function validateIntent(
  intent: ExtractedTextConfigurationIntent,
  changes: TextConfigChange[],
  clarifications: TextConfigClarification[],
) {
  const messages: string[] = [];

  if (changes.length === 0) {
    messages.push("No supported account setting was detected.");
  }

  if (intent.maxConsecutiveNights === 1 && !intent.workerCount) {
    messages.push("A strict one-night limit should be reviewed with staffing capacity data.");
  }

  if (clarifications.some((clarification) => clarification.blocking)) {
    messages.push("Blocking clarifications must be resolved before saving.");
  }

  return messages;
}

function calculateConfidence(
  intent: ExtractedTextConfigurationIntent,
  clarifications: TextConfigClarification[],
  validationMessages: string[],
) {
  const detectedFields = Object.values(intent).filter((value) => value !== null).length;
  const baseConfidence = Math.min(0.92, 0.42 + detectedFields * 0.12);
  const penalty = clarifications.length * 0.12 + validationMessages.length * 0.1;

  return Math.max(0.18, Number((baseConfidence - penalty).toFixed(2)));
}

function extractDepartment(normalizedText: string) {
  if (/\b(jip|icu)\b/.test(normalizedText)) {
    return "JIP";
  }

  if (/\b(emergency|urgent|er)\b/.test(normalizedText)) {
    return "Emergency";
  }

  if (/\b(surgery|chirurgie)\b/.test(normalizedText)) {
    return "Surgery";
  }

  if (/\b(cardiology|kardio|kardiologie)\b/.test(normalizedText)) {
    return "Cardiology";
  }

  return null;
}

function extractAccountName(input: string) {
  const match = input.match(/\b(Motol|Brno)\s+[A-Z][A-Za-z]+/);
  return match?.[0] ?? null;
}

function extractWorkerCount(normalizedText: string) {
  const match = normalizedText.match(/(\d+)\s*(sester|sestry|sestrami|pracovniku|pracovnik|workers|nurses|lidi|people)/);
  return match ? Number(match[1]) : null;
}

function extractExportModule(normalizedText: string): "EGJE" | null {
  return normalizedText.includes("egje") ? "EGJE" : null;
}

function extractMaxConsecutiveNights(normalizedText: string) {
  const blocksNightSequence = /(nikdo|nesmi|zakaz|max|maximum).*(nocni|night).*po sobe/.test(normalizedText);

  if (!blocksNightSequence) {
    return null;
  }

  if (/(dve|2|two).*(nocni|night).*po sobe/.test(normalizedText)) {
    return 1;
  }

  if (/(tri|3|three).*(nocni|night).*po sobe/.test(normalizedText)) {
    return 2;
  }

  return null;
}

function extractShadowLoginIntent(normalizedText: string) {
  if (!normalizedText.includes("shadow")) {
    return null;
  }

  if (/(povolit|allow|enable)/.test(normalizedText)) {
    return true;
  }

  if (/(zakazat|block|disable)/.test(normalizedText)) {
    return false;
  }

  return null;
}

function normalizeText(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
