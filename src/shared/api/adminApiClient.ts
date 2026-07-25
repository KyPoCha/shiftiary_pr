import type { AdminDataSnapshot } from "./adminDataStore";
import type { TextConfigAnalysis } from "../../features/text-configuration/types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export function hasAdminApi() {
  return Boolean(apiBaseUrl);
}

export async function fetchAdminData() {
  if (!apiBaseUrl) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/api/admin-data`);

  if (!response.ok) {
    throw new Error(`Admin API returned ${response.status}`);
  }

  const data = (await response.json()) as AdminDataSnapshot;
  return isAdminDataSnapshot(data) ? data : null;
}

export async function persistAdminData(data: AdminDataSnapshot) {
  if (!apiBaseUrl) {
    return;
  }

  await fetch(`${apiBaseUrl}/api/admin-data`, {
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export async function analyzeTextConfigurationWithApi(input: string) {
  if (!apiBaseUrl) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/api/text-configuration/analyze`, {
    body: JSON.stringify({ input }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as TextConfigAnalysis;
}

function isAdminDataSnapshot(value: unknown): value is AdminDataSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof AdminDataSnapshot, unknown>>;

  return (
    Array.isArray(candidate.customers) &&
    Array.isArray(candidate.accountGroups) &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.auditEvents) &&
    (candidate.textConfigurationRuns === undefined || Array.isArray(candidate.textConfigurationRuns)) &&
    Boolean(candidate.featureTogglesByAccount) &&
    Boolean(candidate.shadowLoginPolicies) &&
    Boolean(candidate.generatorRulesByAccount)
  );
}
