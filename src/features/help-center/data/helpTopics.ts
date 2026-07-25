import type { HelpTopic, HelpTopicId } from "../types";

export const helpTopics: HelpTopic[] = [
  {
    id: "customer-accounts",
    title: "Customer Accounts",
    category: "Task 1",
    summary:
      "The central workspace for hospital customers, department accounts, inherited configuration, shadow login, and support auditability.",
    whenToUse: [
      "Find a hospital department account.",
      "Understand account ownership, status, groups, and feature configuration.",
      "Perform support actions that should be visible in audit history.",
    ],
    keyDecisions: [
      "The UI separates customer, department account, login identity, and configuration target.",
      "Sensitive actions are close to audit history so support can see cause and effect.",
      "Local prototype state will later move behind a typed API and persistent database.",
    ],
    riskNotes: [
      "Admins need clear context before changing inherited settings.",
      "Shadow login should be auditable even when a reason is optional for SLA support.",
    ],
  },
  {
    id: "account-directory",
    title: "Account Directory",
    category: "Task 1",
    summary:
      "Searchable list of tenant accounts, usually one department or operational unit inside a hospital customer.",
    whenToUse: [
      "Switch between hospital departments.",
      "Search by account name, hospital name, department, or owner.",
      "Check whether an account is active, trial, suspended, or archived.",
    ],
    keyDecisions: [
      "The directory shows tenant accounts, not human login accounts.",
      "Status is visible before selection because support work often starts with account health.",
    ],
    riskNotes: [
      "The word account is overloaded, so directory copy should avoid implying a user login.",
    ],
  },
  {
    id: "account-overview",
    title: "Account Overview",
    category: "Task 1",
    summary:
      "A compact decision-support panel that shows scale, ownership, plan, recent activity, and risk signals before an admin changes configuration.",
    whenToUse: [
      "Check whether an account needs review.",
      "Understand account size and support owner.",
      "See high-risk enabled toggles or active shadow sessions at a glance.",
    ],
    keyDecisions: [
      "Risk signal is derived from current local state instead of being a static badge.",
      "Operational facts are separated from editable controls to reduce accidental changes.",
    ],
    riskNotes: [
      "Derived health labels should stay explainable so admins trust them.",
    ],
  },
  {
    id: "account-relationships",
    title: "Account Relationships",
    category: "Task 1",
    summary:
      "Shows how a selected department account relates to the parent customer, account groups, and sibling accounts.",
    whenToUse: [
      "Add or remove an account from shared policy groups.",
      "Understand which sibling accounts may share inherited configuration.",
      "Explain why a setting appears inherited.",
    ],
    keyDecisions: [
      "Groups are first-class because they explain inheritance.",
      "Relationship changes create audit events immediately in the prototype.",
    ],
    riskNotes: [
      "Removing an account from a group can change inherited toggles, reports, exports, or security policy.",
    ],
  },
  {
    id: "feature-toggles",
    title: "Feature Toggles",
    category: "Task 1",
    summary:
      "Controls account-level modules and shows whether each setting is explicitly enabled, disabled, or inherited from a group/customer default.",
    whenToUse: [
      "Enable integrations such as EGJE export.",
      "Roll out high-risk scheduling features selectively.",
      "Compare inherited settings with explicit account overrides.",
    ],
    keyDecisions: [
      "Toggle state uses a three-way model: enabled, disabled, inherited.",
      "High-risk enabled toggles are surfaced in the panel header and account overview.",
      "Every change updates last-change metadata and audit history.",
    ],
    riskNotes: [
      "High-risk toggles should require stronger permissions in the future API layer.",
      "Inherited state needs a visible source so support can explain behavior to customers.",
    ],
  },
  {
    id: "shadow-login",
    title: "Shadow Login",
    category: "Task 1",
    summary:
      "Controlled impersonation flow for eligible support/admin workers to enter a customer account context.",
    whenToUse: [
      "Reproduce a customer-reported issue.",
      "Verify customer-visible configuration or export state.",
      "Support an account without asking the customer for credentials.",
    ],
    keyDecisions: [
      "Start action uses a confirmation modal so the main page stays clean.",
      "Reason is optional for eligible SLA support but still captured when provided.",
      "Start and end actions write audit events.",
    ],
    riskNotes: [
      "Shadow login is sensitive because it exposes customer account context.",
      "Production should enforce role checks, session expiry, and action-level audit logs.",
    ],
  },
  {
    id: "audit-history",
    title: "Audit History",
    category: "Task 1",
    summary:
      "Chronological record of account-sensitive actions such as toggle changes, group membership updates, account creation, and shadow-login sessions.",
    whenToUse: [
      "Review what changed recently.",
      "Filter warning or critical events.",
      "Explain support actions during a customer conversation.",
    ],
    keyDecisions: [
      "Audit is shown beside sensitive controls, not hidden in a separate admin-only area.",
      "The prototype filters by severity to keep noisy histories scannable.",
    ],
    riskNotes: [
      "Production audit events should be append-only and persisted outside frontend state.",
    ],
  },
  {
    id: "generator-evaluation",
    title: "Generator Evaluation",
    category: "Task 2",
    summary:
      "Reserved workspace for proving generator quality when adding the penalty for three consecutive night shifts.",
    whenToUse: [
      "Compare old and new stochastic generator runs.",
      "Review benchmark datasets and penalty breakdowns.",
      "Document statistical validation methodology.",
    ],
    keyDecisions: [
      "Task 2 stays separate from account administration but shares the same internal admin shell.",
      "The future UI should compare distributions across repeated runs, not single outputs.",
    ],
    riskNotes: [
      "A stochastic algorithm needs seeded benchmarks, repeated runs, and acceptance thresholds.",
    ],
  },
];

export function getHelpTopic(topicId: HelpTopicId) {
  return helpTopics.find((topic) => topic.id === topicId);
}
