export type HelpTopicId =
  | "customer-accounts"
  | "account-directory"
  | "account-overview"
  | "account-relationships"
  | "feature-toggles"
  | "shadow-login"
  | "audit-history"
  | "generator-evaluation";

export type HelpTopic = {
  id: HelpTopicId;
  title: string;
  category: "Task 1" | "Task 2" | "Platform";
  summary: string;
  whenToUse: string[];
  keyDecisions: string[];
  riskNotes: string[];
};
