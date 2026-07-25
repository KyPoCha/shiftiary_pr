import { z } from "zod";

export const AccountStatusSchema = z.enum(["active", "trial", "suspended", "archived"]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

export const FeatureToggleStateSchema = z.enum(["enabled", "disabled", "inherited"]);
export type FeatureToggleState = z.infer<typeof FeatureToggleStateSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string(),
  contractTier: z.enum(["standard", "enterprise", "pilot"]),
  region: z.string(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const AccountGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  customerId: z.string(),
  description: z.string(),
  memberAccountIds: z.array(z.string()),
});
export type AccountGroup = z.infer<typeof AccountGroupSchema>;

export const AccountSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  department: z.string(),
  status: AccountStatusSchema,
  plan: z.enum(["core", "advanced", "enterprise"]),
  timezone: z.string(),
  groupIds: z.array(z.string()),
  seats: z.number().int().nonnegative(),
  workers: z.number().int().nonnegative(),
  owner: z.string(),
  lastScheduleGeneratedAt: z.string(),
});
export type Account = z.infer<typeof AccountSchema>;

export const FeatureToggleSchema = z.object({
  id: z.string(),
  label: z.string(),
  area: z.enum(["Scheduling", "Exports", "Security", "Reporting", "Integrations"]),
  state: FeatureToggleStateSchema,
  inheritedFrom: z.string().nullable(),
  risk: z.enum(["low", "medium", "high"]),
  updatedBy: z.string(),
  updatedAt: z.string(),
});
export type FeatureToggle = z.infer<typeof FeatureToggleSchema>;

export const ShadowLoginPolicySchema = z.object({
  accountId: z.string(),
  internalAdminsAllowed: z.boolean(),
  customerAdminsAllowed: z.boolean(),
  reasonRequired: z.boolean(),
  maxSessionMinutes: z.number().int().positive(),
  activeSessionCount: z.number().int().nonnegative(),
  lastSessionAt: z.string().nullable(),
});
export type ShadowLoginPolicy = z.infer<typeof ShadowLoginPolicySchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  createdAt: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
