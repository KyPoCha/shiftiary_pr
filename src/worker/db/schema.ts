import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  contractTier: text("contract_tier", { enum: ["standard", "enterprise", "pilot"] }).notNull(),
  region: text("region").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  department: text("department").notNull(),
  status: text("status", { enum: ["active", "trial", "suspended", "archived"] }).notNull(),
  plan: text("plan", { enum: ["core", "advanced", "enterprise"] }).notNull(),
  timezone: text("timezone").notNull(),
  seats: integer("seats").notNull(),
  workers: integer("workers").notNull(),
  owner: text("owner").notNull(),
  lastScheduleGeneratedAt: text("last_schedule_generated_at").notNull(),
});

export const accountGroups = sqliteTable("account_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
});

export const accountGroupMembers = sqliteTable("account_group_members", {
  groupId: text("group_id").notNull().references(() => accountGroups.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
});

export const featureToggles = sqliteTable("feature_toggles", {
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  label: text("label").notNull(),
  area: text("area", { enum: ["Scheduling", "Exports", "Security", "Reporting", "Integrations"] }).notNull(),
  state: text("state", { enum: ["enabled", "disabled", "inherited"] }).notNull(),
  inheritedFrom: text("inherited_from"),
  risk: text("risk", { enum: ["low", "medium", "high"] }).notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const shadowLoginPolicies = sqliteTable("shadow_login_policies", {
  accountId: text("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  internalAdminsAllowed: integer("internal_admins_allowed", { mode: "boolean" }).notNull(),
  customerAdminsAllowed: integer("customer_admins_allowed", { mode: "boolean" }).notNull(),
  reasonRequired: integer("reason_required", { mode: "boolean" }).notNull(),
  maxSessionMinutes: integer("max_session_minutes").notNull(),
  activeSessionCount: integer("active_session_count").notNull(),
  lastSessionAt: text("last_session_at"),
});

export const generatorRules = sqliteTable("generator_rules", {
  accountId: text("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  maxConsecutiveNights: integer("max_consecutive_nights").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  createdAt: text("created_at").notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
});

export const textConfigurationRuns = sqliteTable("text_configuration_runs", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  originalText: text("original_text").notNull(),
  structuredIntentJson: text("structured_intent_json").notNull(),
  previewJson: text("preview_json").notNull(),
  appliedBy: text("applied_by").notNull(),
  createdAt: text("created_at").notNull(),
});
