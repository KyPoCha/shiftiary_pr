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
    id: "customer-directory",
    title: "Customer Directory",
    category: "Task 1",
    summary:
      "Tenant-level selector for switching between hospital customers before working with their department accounts.",
    whenToUse: [
      "Find a hospital by name, legal entity, region, or contract tier.",
      "Switch the account workspace to another customer portfolio.",
      "Check how many department accounts belong to a customer before opening one.",
    ],
    keyDecisions: [
      "Customers are separated from department accounts because one customer can own multiple operational accounts.",
      "Search includes legal name and region because support often starts from contract or location context.",
      "The selected customer controls which account list, metrics, and creation flow are shown.",
    ],
    riskNotes: [
      "Actions should always show both customer and account context so admins do not change the wrong tenant.",
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
      "Workspace for proving generator quality when adding the penalty for three consecutive night shifts.",
    whenToUse: [
      "Paste and validate exported scheduling JSON.",
      "Compare old and new rule variants across several scheduler algorithms.",
      "Review benchmark datasets and penalty breakdowns.",
      "Document statistical validation methodology.",
    ],
    keyDecisions: [
      "Task 2 stays separate from account administration but shares the same internal admin shell.",
      "The UI compares distributions across repeated runs, not single outputs.",
      "Imported datasets are normalized into the same snapshot shape as built-in benchmarks.",
      "Penalty breakdowns keep existing behavior visible while the new rule is evaluated.",
      "Algorithm choices show speed, memory, and quality tradeoffs explicitly.",
    ],
    riskNotes: [
      "A stochastic algorithm needs seeded benchmarks, repeated runs, and acceptance thresholds.",
    ],
  },
  {
    id: "generator-dataset-input",
    title: "Dataset Input",
    category: "Task 2",
    summary:
      "Validates pasted scheduling exports before they become benchmark inputs for the generator comparison.",
    whenToUse: [
      "Paste a SQL or database export for a real scheduling snapshot.",
      "Check whether workers, requirements, absences, and preferences are structurally valid.",
      "Turn imported data into the same normalized shape used by built-in benchmarks.",
    ],
    keyDecisions: [
      "Validation happens before running any algorithm so broken data cannot produce misleading results.",
      "Zod checks the required contract while unknown export fields are tolerated.",
      "Date references are checked against requirement dates to catch out-of-range worker constraints.",
    ],
    riskNotes: [
      "A valid JSON object is not automatically a meaningful benchmark; missing skills or business rules would still need production mapping.",
      "Large production exports should move to a backend job instead of blocking the browser thread.",
    ],
  },
  {
    id: "generator-benchmarks",
    title: "Benchmark Datasets",
    category: "Task 2",
    summary:
      "Fixed input snapshots used to compare current and candidate generator behavior across realistic scheduling conditions.",
    whenToUse: [
      "Switch between baseline, night-heavy, small-team, stress, and imported snapshots.",
      "Check whether the new penalty works only on easy data or across hard cases.",
      "Explain which data was used to prove the change.",
    ],
    keyDecisions: [
      "Benchmarks are fixed snapshots, not live mutable customer state.",
      "Imported datasets appear in the same list as demo datasets so the algorithm path is identical.",
      "Risk profiles help reviewers understand why one dataset may trade off preferences, coverage, or runtime differently.",
    ],
    riskNotes: [
      "A release decision should include at least one historical case where three consecutive nights occurred.",
      "Anonymized production snapshots should preserve constraints even when names are removed.",
    ],
  },
  {
    id: "generator-algorithms",
    title: "Scheduler Algorithms",
    category: "Task 2",
    summary:
      "Selectable strategies that show the quality, speed, memory, and complexity tradeoffs of the generator approach.",
    whenToUse: [
      "Compare greedy construction with local repair and annealing-style search.",
      "Discuss why the production optimizer should use incremental scoring for local moves.",
      "Choose which strategy drives the detailed old-vs-new and penalty breakdown panels.",
    ],
    keyDecisions: [
      "Greedy gives a fast initial schedule but can lock in early bad choices.",
      "Repair accepts only improving moves, which is predictable but can stop in a local minimum.",
      "Annealing can accept temporary regressions to escape local minima, then keeps the best schedule found.",
    ],
    riskNotes: [
      "Algorithm runtime is browser-scaled in the prototype; production should execute full runs in a backend worker or job queue.",
      "A better score is useful only if hard constraints and operational gates still pass.",
    ],
  },
  {
    id: "generator-old-vs-new",
    title: "Old vs New Algorithm",
    category: "Task 2",
    summary:
      "Primary comparison between the current rule variant and the candidate variant with the three-night penalty enabled.",
    whenToUse: [
      "Check whether the selected dataset has already been simulated.",
      "Compare total penalty, median, p95, three-night blocks, and zero-block run rate.",
      "Decide whether the candidate result is a likely improvement or needs investigation.",
    ],
    keyDecisions: [
      "The panel uses the last completed simulation, so validating a dataset does not silently replace results.",
      "Current and candidate are scored with common release criteria so comparison stays fair.",
      "The decision signal summarizes total penalty movement and zero-three-night improvement.",
    ],
    riskNotes: [
      "Do not compare only one best generated schedule; stochastic generators need repeated-run distributions.",
      "A lower total penalty does not replace reviewing hard constraints and individual component regressions.",
    ],
  },
  {
    id: "generator-algorithm-comparison",
    title: "Algorithm Comparison",
    category: "Task 2",
    summary:
      "Side-by-side view of candidate behavior across scheduler strategies for the currently simulated dataset.",
    whenToUse: [
      "Explain how different optimization strategies respond to the same new penalty.",
      "Compare penalty delta, remaining three-night blocks, and browser runtime.",
      "Identify whether a quality improvement depends on a slower or more complex algorithm.",
    ],
    keyDecisions: [
      "The selected algorithm controls the detailed panels while the comparison keeps the alternatives visible.",
      "Runtime is shown as an evaluation signal, not as a production SLA measurement.",
      "The prototype favors readable algorithms but includes incremental scoring to avoid full rescoring per move.",
    ],
    riskNotes: [
      "A strategy that wins on one benchmark may lose on a stress case.",
      "Production should validate across multiple seeds before changing default algorithm behavior.",
    ],
  },
  {
    id: "generator-penalty-breakdown",
    title: "Penalty Breakdown",
    category: "Task 2",
    summary:
      "Component-level comparison used to prove the new three-night rule improved without hiding regressions elsewhere.",
    whenToUse: [
      "Inspect why total penalty changed.",
      "Check whether overtime, preferences, rest, coverage, or fairness regressed.",
      "Support a release decision with explicit component tolerances.",
    ],
    keyDecisions: [
      "The new rule is reported separately from existing penalty families.",
      "Each component has a regression tolerance so review is not based on gut feel.",
      "Mean component values are shown across repeated runs rather than a single schedule.",
    ],
    riskNotes: [
      "Coverage and infeasibility should be hard gates even if the new night rule improves.",
      "Tolerance thresholds should be agreed before looking at candidate results.",
    ],
  },
  {
    id: "generator-validation-methodology",
    title: "Validation Methodology",
    category: "Task 2",
    summary:
      "Release gates for proving a stochastic generator change is better and operationally safe.",
    whenToUse: [
      "Review the answer to the assessment question.",
      "Confirm seed control, repeated runs, regression thresholds, and runtime budget.",
      "Decide whether the candidate should pass, be watched, or be blocked.",
    ],
    keyDecisions: [
      "Validation uses paired seeds where possible so current and candidate runs are comparable.",
      "The candidate must improve three-night blocks on every benchmark, not only on average.",
      "Existing penalties and runtime have explicit guardrails.",
    ],
    riskNotes: [
      "If a benchmark fails, investigate by dataset, seed, final schedule, and component breakdown.",
      "Feature-flag rollout is safer because small teams may need account-specific weights.",
    ],
  },
  {
    id: "generator-engine-model",
    title: "Engine Model",
    category: "Task 2",
    summary:
      "Technical notes on the browser-local optimizer model and how it maps to a production generator.",
    whenToUse: [
      "Explain why the prototype can run locally while production takes about five minutes.",
      "Discuss algorithm complexity, memory shape, and incremental scoring.",
      "Separate demo implementation constraints from production architecture.",
    ],
    keyDecisions: [
      "The browser model uses scaled datasets so the page remains interactive.",
      "Local search updates score deltas for affected workers instead of rescoring the full matrix.",
      "Production-scale validation should run in backend jobs with persisted inputs and outputs.",
    ],
    riskNotes: [
      "Browser runtime measurements are directional only.",
      "The real optimizer should persist seeds, input hashes, and run artifacts for auditability.",
    ],
  },
  {
    id: "text-configuration",
    title: "Text Configuration",
    category: "Bonus",
    summary:
      "Prototype for converting natural-language setup requests into validated account configuration changes.",
    whenToUse: [
      "Create or adjust account settings faster than clicking through several forms.",
      "Explain how LLM extraction and deterministic validation should cooperate.",
      "Preview exactly what would change before writing to the database.",
    ],
    keyDecisions: [
      "Free text is never saved directly as configuration.",
      "The LLM produces structured intent; schemas and domain code decide whether it is valid.",
      "Ambiguous or risky instructions block apply until an admin clarifies the intent.",
    ],
    riskNotes: [
      "Production should persist the original text, structured intent, approved diff, actor, and audit event.",
      "High-risk settings such as security policy or strict generator rules need role checks and stronger confirmation.",
    ],
  },
  {
    id: "text-configuration-input",
    title: "Configuration Text Input",
    category: "Bonus",
    summary:
      "Natural-language entry point for account setup requests such as workers, exports, and generator rules.",
    whenToUse: [
      "Paste a customer request or write an internal setup instruction.",
      "Try known examples before designing a production prompt contract.",
      "Capture the user's intended change in one place before parsing.",
    ],
    keyDecisions: [
      "The prototype accepts Czech and English keywords for the assessment examples.",
      "Analyze is explicit so users control when interpretation happens.",
      "Sample prompts make supported capabilities discoverable without explanatory page text.",
    ],
    riskNotes: [
      "Production should guard against prompt injection and ignore instructions unrelated to account configuration.",
    ],
  },
  {
    id: "text-configuration-validation",
    title: "Structured Intent Validation",
    category: "Bonus",
    summary:
      "The structured JSON boundary used to validate model output before building a change preview.",
    whenToUse: [
      "Inspect what the system understood from the user's text.",
      "Check confidence and extracted fields before reviewing the diff.",
      "Debug why a request produced no changes or required clarification.",
    ],
    keyDecisions: [
      "The Worker uses LLM structured output when configured and deterministic fallback when unavailable.",
      "Enums and ranges prevent invalid modules, impossible worker counts, or unsupported rules.",
      "Domain validation can reject combinations that are syntactically valid but operationally risky.",
    ],
    riskNotes: [
      "Structured intent is not the final source of truth; the approved change set is.",
    ],
  },
  {
    id: "text-configuration-preview",
    title: "Configuration Preview",
    category: "Bonus",
    summary:
      "Human review step that shows before/after changes before anything is applied.",
    whenToUse: [
      "Review feature toggles, worker placeholders, account context, and generator rules.",
      "Check risk labels before approving a change batch.",
      "Confirm that high-risk changes were interpreted correctly.",
    ],
    keyDecisions: [
      "Apply is disabled while blocking clarifications or validation messages exist.",
      "Each change records whether it came from extraction or deterministic transformation.",
      "Production should write all approved changes in one transaction with an audit event.",
    ],
    riskNotes: [
      "Preview diffs should include inherited settings and permission impact before production launch.",
    ],
  },
  {
    id: "text-configuration-ambiguity",
    title: "Ambiguity Handling",
    category: "Bonus",
    summary:
      "Clarification model for vague or risky text that should not be saved automatically.",
    whenToUse: [
      "Identify missing target account, vague export module, or unclear night-rule wording.",
      "Distinguish blocking questions from non-blocking review notes.",
      "Explain why the system asks follow-up questions instead of guessing.",
    ],
    keyDecisions: [
      "Missing target account and unsupported export references are blocking.",
      "Large worker creation is non-blocking but still flagged for review.",
      "Clarifications should become structured answers before the final diff is rebuilt.",
    ],
    riskNotes: [
      "Production should not rely on natural-language clarification text alone; use typed choices.",
    ],
  },
];

export function getHelpTopic(topicId: HelpTopicId) {
  return helpTopics.find((topic) => topic.id === topicId);
}
