export type TextConfigChangeType = "account" | "workers" | "feature" | "generator-rule";

export type TextConfigRisk = "low" | "medium" | "high";

export type TextConfigChange = {
  id: string;
  type: TextConfigChangeType;
  title: string;
  target: string;
  before: string;
  after: string;
  risk: TextConfigRisk;
  source: "llm" | "deterministic";
};

export type TextConfigClarification = {
  id: string;
  question: string;
  options: string[];
  blocking: boolean;
};

export type TextConfigAnalysis = {
  normalizedText: string;
  confidence: number;
  extractedIntent: {
    accountName: string | null;
    department: string | null;
    workerCount: number | null;
    exportModule: "EGJE" | null;
    maxConsecutiveNights: number | null;
    shadowLoginAllowed: boolean | null;
  };
  changes: TextConfigChange[];
  clarifications: TextConfigClarification[];
  validationMessages: string[];
  canApply: boolean;
  extractionSource?: "llm" | "deterministic";
  extractionModel?: string | null;
  fallbackReason?: string | null;
};

export type AppliedConfigurationEvent = {
  id: string;
  createdAt: string;
  customerId: string;
  accountId: string | null;
  originalText: string;
  summary: string;
  changeCount: number;
  appliedBy: string;
};
