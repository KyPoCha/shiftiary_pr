import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import {
  accountGroups,
  accounts,
  auditEvents,
  customers,
  featureTogglesByAccount,
  generatorRulesByAccount,
  shadowLoginPolicies,
} from "../../features/accounts/data/accounts";
import {
  AccountSchema,
  type Account,
  type AccountGroup,
  type AuditEvent,
  type Customer,
  type FeatureToggle,
  type FeatureToggleState,
  type GeneratorRule,
  type ShadowLoginPolicy,
} from "../../features/accounts/types";
import type { AppliedConfigurationEvent, TextConfigAnalysis } from "../../features/text-configuration/types";
import { fetchAdminData, hasAdminApi, persistAdminData } from "./adminApiClient";

export type AdminDataSnapshot = {
  customers: Customer[];
  accountGroups: AccountGroup[];
  accounts: Account[];
  featureTogglesByAccount: Record<string, FeatureToggle[]>;
  shadowLoginPolicies: Record<string, ShadowLoginPolicy>;
  generatorRulesByAccount: Record<string, GeneratorRule>;
  auditEvents: AuditEvent[];
  textConfigurationRuns: AppliedConfigurationEvent[];
};

type CreateAccountDraft = {
  customerId: string;
  department: string;
  name: string;
  owner: string;
  seats: number;
  workers: number;
};

type AdminDataContextValue = {
  data: AdminDataSnapshot;
  addAuditEvent: (event: Omit<AuditEvent, "id" | "createdAt">) => void;
  changeToggleState: (accountId: string, toggleId: string, state: FeatureToggleState, inheritedFrom?: string | null) => void;
  createAccount: (draft: CreateAccountDraft) => Account;
  endShadowSession: (accountId: string) => void;
  resetAdminData: () => void;
  setGroupMembership: (accountId: string, groupId: string, shouldJoin: boolean) => void;
  startShadowSession: (accountId: string, reason?: string) => void;
  applyTextConfiguration: (analysis: TextConfigAnalysis, customerId: string, originalText: string) => Account | null;
};

const storageKey = "rozpis-admin-data-v1";
const AdminDataContext = createContext<AdminDataContextValue | null>(null);

const initialAdminData: AdminDataSnapshot = {
  customers,
  accountGroups,
  accounts,
  featureTogglesByAccount,
  shadowLoginPolicies,
  generatorRulesByAccount,
  auditEvents,
  textConfigurationRuns: [],
};

export function AdminDataProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AdminDataSnapshot>(() => loadSnapshot());
  const [hasLoadedRemoteData, setHasLoadedRemoteData] = useState(!hasAdminApi());

  useEffect(() => {
    if (!hasAdminApi()) {
      return;
    }

    fetchAdminData()
      .then((snapshot) => {
        if (snapshot) {
          setData(hydrateSnapshot(snapshot));
        }
      })
      .finally(() => setHasLoadedRemoteData(true));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(data));

    if (hasLoadedRemoteData) {
      void persistAdminData(data);
    }
  }, [data, hasLoadedRemoteData]);

  const value = useMemo<AdminDataContextValue>(
    () => ({
      data,
      addAuditEvent(event) {
        setData((currentData) => addAuditEventToSnapshot(currentData, event));
      },
      changeToggleState(accountId, toggleId, state, inheritedFrom = null) {
        setData((currentData) => {
          const toggle = currentData.featureTogglesByAccount[accountId]?.find((item) => item.id === toggleId);
          return addAuditEventToSnapshot(
            {
              ...currentData,
              featureTogglesByAccount: {
                ...currentData.featureTogglesByAccount,
                [accountId]: (currentData.featureTogglesByAccount[accountId] ?? []).map((item) =>
                  item.id === toggleId
                    ? {
                        ...item,
                        state,
                        inheritedFrom,
                        updatedAt: new Date().toISOString(),
                        updatedBy: "Current Admin",
                      }
                    : item,
                ),
              },
            },
            {
              accountId,
              actor: "Current Admin",
              action: `Set ${toggle?.label ?? "feature toggle"} to ${state}`,
              target: "Feature toggle",
              severity: toggle?.risk === "high" ? "warning" : "info",
            },
          );
        });
      },
      createAccount(draft) {
        const account = buildAccount(data, draft);
        setData((currentData) => insertAccount(currentData, account, draft.customerId));
        return account;
      },
      endShadowSession(accountId) {
        setData((currentData) =>
          addAuditEventToSnapshot(
            {
              ...currentData,
              shadowLoginPolicies: {
                ...currentData.shadowLoginPolicies,
                [accountId]: {
                  ...currentData.shadowLoginPolicies[accountId],
                  activeSessionCount: Math.max(0, currentData.shadowLoginPolicies[accountId].activeSessionCount - 1),
                },
              },
            },
            {
              accountId,
              actor: "Current Admin",
              action: "Ended shadow-login session",
              target: currentData.accounts.find((account) => account.id === accountId)?.name ?? accountId,
              severity: "info",
            },
          ),
        );
      },
      resetAdminData() {
        window.localStorage.removeItem(storageKey);
        setData(initialAdminData);
      },
      setGroupMembership(accountId, groupId, shouldJoin) {
        setData((currentData) => {
          const group = currentData.accountGroups.find((item) => item.id === groupId);
          return addAuditEventToSnapshot(
            {
              ...currentData,
              accountGroups: currentData.accountGroups.map((item) =>
                item.id === groupId
                  ? {
                      ...item,
                      memberAccountIds: shouldJoin
                        ? Array.from(new Set([...item.memberAccountIds, accountId]))
                        : item.memberAccountIds.filter((memberAccountId) => memberAccountId !== accountId),
                    }
                  : item,
              ),
              accounts: currentData.accounts.map((account) =>
                account.id === accountId
                  ? {
                      ...account,
                      groupIds: shouldJoin
                        ? Array.from(new Set([...account.groupIds, groupId]))
                        : account.groupIds.filter((item) => item !== groupId),
                    }
                  : account,
              ),
            },
            {
              accountId,
              actor: "Current Admin",
              action: `${shouldJoin ? "Added account to" : "Removed account from"} ${group?.name ?? "group"}`,
              target: "Account relationship",
              severity: "info",
            },
          );
        });
      },
      startShadowSession(accountId, reason) {
        setData((currentData) =>
          addAuditEventToSnapshot(
            {
              ...currentData,
              shadowLoginPolicies: {
                ...currentData.shadowLoginPolicies,
                [accountId]: {
                  ...currentData.shadowLoginPolicies[accountId],
                  activeSessionCount: currentData.shadowLoginPolicies[accountId].activeSessionCount + 1,
                  lastSessionAt: new Date().toISOString(),
                },
              },
            },
            {
              accountId,
              actor: "Current Admin",
              action: reason ? `Started shadow-login session: ${reason}` : "Started shadow-login session without reason",
              target: currentData.accounts.find((account) => account.id === accountId)?.name ?? accountId,
              severity: "warning",
            },
          ),
        );
      },
      applyTextConfiguration(analysis, customerId, originalText) {
        const result = applyTextConfigurationToSnapshot(data, analysis, customerId, originalText);
        setData(result.snapshot);
        return result.account;
      },
    }),
    [data],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const value = useContext(AdminDataContext);

  if (!value) {
    throw new Error("useAdminData must be used inside AdminDataProvider");
  }

  return value;
}

function loadSnapshot(): AdminDataSnapshot {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? hydrateSnapshot({ ...initialAdminData, ...JSON.parse(value) }) : initialAdminData;
  } catch {
    return initialAdminData;
  }
}

function hydrateSnapshot(snapshot: AdminDataSnapshot): AdminDataSnapshot {
  return {
    ...initialAdminData,
    ...snapshot,
    textConfigurationRuns: snapshot.textConfigurationRuns ?? [],
  };
}

function addAuditEventToSnapshot(
  snapshot: AdminDataSnapshot,
  event: Omit<AuditEvent, "id" | "createdAt">,
): AdminDataSnapshot {
  return {
    ...snapshot,
    auditEvents: [
      {
        ...event,
        id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      },
      ...snapshot.auditEvents,
    ],
  };
}

function buildAccount(data: AdminDataSnapshot, draft: CreateAccountDraft): Account {
  const customer = data.customers.find((item) => item.id === draft.customerId) ?? data.customers[0];
  return AccountSchema.parse({
    id: `acct-${slugify(customer.name)}-${slugify(draft.department)}-${Date.now().toString(36)}`,
    customerId: customer.id,
    name: draft.name,
    department: draft.department,
    status: "trial",
    plan: customer.contractTier === "enterprise" ? "advanced" : "core",
    timezone: "Europe/Prague",
    groupIds: [],
    seats: draft.seats,
    workers: draft.workers,
    owner: draft.owner,
    lastScheduleGeneratedAt: new Date().toISOString(),
  });
}

function insertAccount(snapshot: AdminDataSnapshot, account: Account, customerId: string): AdminDataSnapshot {
  return addAuditEventToSnapshot(
    {
      ...snapshot,
      accounts: [...snapshot.accounts, account],
      featureTogglesByAccount: {
        ...snapshot.featureTogglesByAccount,
        [account.id]: createDefaultFeatureToggles(),
      },
      shadowLoginPolicies: {
        ...snapshot.shadowLoginPolicies,
        [account.id]: {
          accountId: account.id,
          internalAdminsAllowed: true,
          customerAdminsAllowed: false,
          reasonRequired: false,
          maxSessionMinutes: 20,
          activeSessionCount: 0,
          lastSessionAt: null,
        },
      },
      generatorRulesByAccount: {
        ...snapshot.generatorRulesByAccount,
        [account.id]: {
          accountId: account.id,
          maxConsecutiveNights: 3,
          updatedBy: "System",
          updatedAt: new Date().toISOString(),
        },
      },
    },
    {
      accountId: account.id,
      actor: "Current Admin",
      action: "Created department account",
      target: snapshot.customers.find((customer) => customer.id === customerId)?.name ?? account.name,
      severity: "info",
    },
  );
}

function applyTextConfigurationToSnapshot(
  snapshot: AdminDataSnapshot,
  analysis: TextConfigAnalysis,
  customerId: string,
  originalText: string,
) {
  if (!analysis.canApply) {
    return { snapshot, account: null };
  }

  const intent = analysis.extractedIntent;
  const targetDepartment = intent.department ?? "Imported";
  let account =
    snapshot.accounts.find(
      (item) => item.customerId === customerId && item.department.toLowerCase() === targetDepartment.toLowerCase(),
    ) ?? null;
  let nextSnapshot = snapshot;

  if (!account) {
    account = buildAccount(snapshot, {
      customerId,
      department: targetDepartment,
      name: intent.accountName ?? `${snapshot.customers.find((customer) => customer.id === customerId)?.name ?? "Customer"} ${targetDepartment}`,
      owner: "Current Admin",
      seats: intent.workerCount ?? 12,
      workers: intent.workerCount ?? 12,
    });
    nextSnapshot = insertAccount(nextSnapshot, account, customerId);
  }

  if (intent.workerCount) {
    nextSnapshot = {
      ...nextSnapshot,
      accounts: nextSnapshot.accounts.map((item) =>
        item.id === account?.id
          ? {
              ...item,
              seats: Math.max(item.seats, intent.workerCount ?? item.seats),
              workers: intent.workerCount ?? item.workers,
            }
          : item,
      ),
    };
  }

  if (intent.exportModule === "EGJE") {
    nextSnapshot = updateToggle(nextSnapshot, account.id, "egje-export", "enabled");
  }

  if (intent.maxConsecutiveNights) {
    nextSnapshot = {
      ...nextSnapshot,
      generatorRulesByAccount: {
        ...nextSnapshot.generatorRulesByAccount,
        [account.id]: {
          accountId: account.id,
          maxConsecutiveNights: intent.maxConsecutiveNights,
          updatedBy: "Text Configuration",
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }

  if (intent.shadowLoginAllowed !== null) {
    nextSnapshot = updateToggle(nextSnapshot, account.id, "customer-shadow-login", intent.shadowLoginAllowed ? "enabled" : "disabled");
    nextSnapshot = {
      ...nextSnapshot,
      shadowLoginPolicies: {
        ...nextSnapshot.shadowLoginPolicies,
        [account.id]: {
          ...nextSnapshot.shadowLoginPolicies[account.id],
          customerAdminsAllowed: intent.shadowLoginAllowed,
        },
      },
    };
  }

  nextSnapshot = addAuditEventToSnapshot(nextSnapshot, {
    accountId: account.id,
    actor: "Text Configuration",
    action: `Applied ${analysis.changes.length} text-derived configuration changes`,
    target: account.name,
    severity: analysis.changes.some((change) => change.risk === "high") ? "warning" : "info",
  });

  const customer = snapshot.customers.find((item) => item.id === customerId);
  const now = new Date().toISOString();
  nextSnapshot = {
    ...nextSnapshot,
    textConfigurationRuns: [
      {
        id: `txt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        accountId: account.id,
        appliedBy: "Current Admin",
        changeCount: analysis.changes.length,
        createdAt: now,
        customerId,
        originalText,
        summary: `${analysis.changes.length} changes applied to ${account.name} (${customer?.name ?? "customer"})`,
      },
      ...nextSnapshot.textConfigurationRuns,
    ],
  };

  return { snapshot: nextSnapshot, account };
}

function updateToggle(
  snapshot: AdminDataSnapshot,
  accountId: string,
  toggleId: string,
  state: FeatureToggleState,
): AdminDataSnapshot {
  const toggles = snapshot.featureTogglesByAccount[accountId] ?? createDefaultFeatureToggles();
  const hasToggle = toggles.some((toggle) => toggle.id === toggleId);
  const nextToggles = (hasToggle ? toggles : [...toggles, createDefaultFeatureToggles().find((toggle) => toggle.id === toggleId)!])
    .map((toggle) =>
      toggle.id === toggleId
        ? {
            ...toggle,
            state,
            inheritedFrom: null,
            updatedBy: "Text Configuration",
            updatedAt: new Date().toISOString(),
          }
        : toggle,
    );

  return {
    ...snapshot,
    featureTogglesByAccount: {
      ...snapshot.featureTogglesByAccount,
      [accountId]: nextToggles,
    },
  };
}

function createDefaultFeatureToggles(): FeatureToggle[] {
  return [
    {
      id: "egje-export",
      label: "EGJE export",
      area: "Exports",
      state: "disabled",
      inheritedFrom: null,
      risk: "medium",
      updatedBy: "System",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "generator-v2",
      label: "Generator V2",
      area: "Scheduling",
      state: "disabled",
      inheritedFrom: null,
      risk: "high",
      updatedBy: "System",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "customer-shadow-login",
      label: "Customer shadow login",
      area: "Security",
      state: "disabled",
      inheritedFrom: null,
      risk: "high",
      updatedBy: "System",
      updatedAt: new Date().toISOString(),
    },
  ];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
