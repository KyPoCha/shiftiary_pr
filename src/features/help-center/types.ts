export type HelpTopicId =
  | "customer-accounts"
  | "customer-directory"
  | "account-directory"
  | "account-overview"
  | "account-relationships"
  | "feature-toggles"
  | "shadow-login"
  | "audit-history"
  | "generator-evaluation"
  | "generator-dataset-input"
  | "generator-benchmarks"
  | "generator-algorithms"
  | "generator-old-vs-new"
  | "generator-algorithm-comparison"
  | "generator-penalty-breakdown"
  | "generator-validation-methodology"
  | "generator-engine-model"
  | "text-configuration"
  | "text-configuration-input"
  | "text-configuration-validation"
  | "text-configuration-preview"
  | "text-configuration-ambiguity";

export type HelpTopic = {
  id: HelpTopicId;
  title: string;
  category: "Task 1" | "Task 2" | "Bonus" | "Platform";
  summary: string;
  whenToUse: string[];
  keyDecisions: string[];
  riskNotes: string[];
};
