import { useMemo, useState } from "react";
import { Activity, Building2, KeyRound, Network, ShieldCheck, ToggleRight } from "lucide-react";
import { Badge } from "../../../shared/components/Badge";
import { AccountDirectory } from "./AccountDirectory";
import { AccountInsightsPanel } from "./AccountInsightsPanel";
import { AccountRelationships } from "./AccountRelationships";
import { AccountSummary } from "./AccountSummary";
import { AuditTimeline } from "./AuditTimeline";
import { FeatureTogglePanel } from "./FeatureTogglePanel";
import { NewAccountModal, type NewAccountDraft } from "./NewAccountModal";
import { ShadowLoginPanel } from "./ShadowLoginPanel";
import {
  accountGroups as initialAccountGroups,
  accounts as initialAccounts,
  auditEvents as initialAuditEvents,
  customers,
  featureTogglesByAccount as initialFeatureTogglesByAccount,
  shadowLoginPolicies as initialShadowLoginPolicies,
} from "../data/accounts";
import { AccountSchema, type Account, type AuditEvent, type FeatureToggleState } from "../types";

export function CustomerAccountsPage() {
  const [accountList, setAccountList] = useState(initialAccounts);
  const [groupList, setGroupList] = useState(initialAccountGroups);
  const [featureTogglesByAccount, setFeatureTogglesByAccount] = useState(initialFeatureTogglesByAccount);
  const [shadowLoginPolicies, setShadowLoginPolicies] = useState(initialShadowLoginPolicies);
  const [accountAuditEvents, setAccountAuditEvents] = useState(initialAuditEvents);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccounts[0].id);
  const selectedAccount = accountList.find((account) => account.id === selectedAccountId) ?? accountList[0];

  const customer = customers.find((item) => item.id === selectedAccount.customerId) ?? customers[0];
  const groups = groupList.filter((group) => selectedAccount.groupIds.includes(group.id));
  const siblingAccounts = accountList.filter(
    (account) => account.customerId === selectedAccount.customerId && account.id !== selectedAccount.id,
  );
  const featureToggles = featureTogglesByAccount[selectedAccount.id] ?? [];
  const shadowLoginPolicy = shadowLoginPolicies[selectedAccount.id];
  const selectedAuditEvents = accountAuditEvents.filter((event) => event.accountId === selectedAccount.id);

  const portfolioStats = useMemo(() => {
    const customerAccounts = accountList.filter((account) => account.customerId === selectedAccount.customerId);

    return {
      accounts: customerAccounts.length,
      workers: customerAccounts.reduce((sum, account) => sum + account.workers, 0),
      inheritedToggles: featureToggles.filter((toggle) => toggle.state === "inherited").length,
      shadowSessions: Object.values(shadowLoginPolicies).reduce(
        (sum, policy) => sum + policy.activeSessionCount,
        0,
      ),
    };
  }, [accountList, featureToggles, selectedAccount.customerId, shadowLoginPolicies]);

  function addAuditEvent(event: Omit<AuditEvent, "id" | "createdAt">) {
    setAccountAuditEvents((currentEvents) => [
      {
        ...event,
        id: `evt-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      },
      ...currentEvents,
    ]);
  }

  function handleChangeToggleState(toggleId: string, state: FeatureToggleState) {
    const toggle = featureToggles.find((item) => item.id === toggleId);
    const inheritedFrom = state === "inherited" ? groups[0]?.name ?? "Customer defaults" : null;

    setFeatureTogglesByAccount((currentToggles) => ({
      ...currentToggles,
      [selectedAccount.id]: (currentToggles[selectedAccount.id] ?? []).map((item) =>
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
    }));

    addAuditEvent({
      accountId: selectedAccount.id,
      actor: "Current Admin",
      action: `Set ${toggle?.label ?? "feature toggle"} to ${state}`,
      target: "Feature toggle",
      severity: toggle?.risk === "high" ? "warning" : "info",
    });
  }

  function handleSetGroupMembership(groupId: string, shouldJoin: boolean) {
    const group = groupList.find((item) => item.id === groupId);

    setGroupList((currentGroups) =>
      currentGroups.map((item) =>
        item.id === groupId
          ? {
              ...item,
              memberAccountIds: shouldJoin
                ? Array.from(new Set([...item.memberAccountIds, selectedAccount.id]))
                : item.memberAccountIds.filter((accountId) => accountId !== selectedAccount.id),
            }
          : item,
      ),
    );

    setAccountList((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === selectedAccount.id
          ? {
              ...account,
              groupIds: shouldJoin
                ? Array.from(new Set([...account.groupIds, groupId]))
                : account.groupIds.filter((item) => item !== groupId),
            }
          : account,
      ),
    );

    addAuditEvent({
      accountId: selectedAccount.id,
      actor: "Current Admin",
      action: `${shouldJoin ? "Added account to" : "Removed account from"} ${group?.name ?? "group"}`,
      target: "Account relationship",
      severity: "info",
    });
  }

  function handleStartShadowSession(reason?: string) {
    setShadowLoginPolicies((currentPolicies) => ({
      ...currentPolicies,
      [selectedAccount.id]: {
        ...currentPolicies[selectedAccount.id],
        activeSessionCount: currentPolicies[selectedAccount.id].activeSessionCount + 1,
        lastSessionAt: new Date().toISOString(),
      },
    }));

    addAuditEvent({
      accountId: selectedAccount.id,
      actor: "Current Admin",
      action: reason
        ? `Started shadow-login session: ${reason}`
        : "Started shadow-login session without reason",
      target: selectedAccount.name,
      severity: "warning",
    });
  }

  function handleEndShadowSession() {
    setShadowLoginPolicies((currentPolicies) => ({
      ...currentPolicies,
      [selectedAccount.id]: {
        ...currentPolicies[selectedAccount.id],
        activeSessionCount: Math.max(0, currentPolicies[selectedAccount.id].activeSessionCount - 1),
      },
    }));

    addAuditEvent({
      accountId: selectedAccount.id,
      actor: "Current Admin",
      action: "Ended shadow-login session",
      target: selectedAccount.name,
      severity: "info",
    });
  }

  function handleCreateAccount(draft: NewAccountDraft) {
    const accountId = `acct-${slugify(customer.name)}-${slugify(draft.department)}-${Date.now().toString(36)}`;
    const nextAccount: Account = AccountSchema.parse({
      id: accountId,
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

    setAccountList((currentAccounts) => [...currentAccounts, nextAccount]);
    setFeatureTogglesByAccount((currentToggles) => ({
      ...currentToggles,
      [accountId]: createDefaultFeatureToggles(),
    }));
    setShadowLoginPolicies((currentPolicies) => ({
      ...currentPolicies,
      [accountId]: {
        accountId,
        internalAdminsAllowed: true,
        customerAdminsAllowed: false,
        reasonRequired: false,
        maxSessionMinutes: 20,
        activeSessionCount: 0,
        lastSessionAt: null,
      },
    }));
    setSelectedAccountId(accountId);
    setIsNewAccountModalOpen(false);
    addAuditEvent({
      accountId,
      actor: "Current Admin",
      action: "Created department account",
      target: draft.name,
      severity: "info",
    });
  }

  function scrollToShadowLogin() {
    document.getElementById("shadow-login-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="page accounts-page">
      <header className="page-header">
        <div>
          <Badge tone="info">Customer administration</Badge>
          <h1>Customer Accounts</h1>
          <p>{customer.name}</p>
        </div>
        <div className="header-actions">
          <button className="button button-secondary" onClick={() => setIsNewAccountModalOpen(true)} type="button">
            <Building2 aria-hidden="true" size={17} />
            New account
          </button>
          <button className="button button-primary" onClick={scrollToShadowLogin} type="button">
            <KeyRound aria-hidden="true" size={17} />
            Shadow login
          </button>
        </div>
      </header>

      <div className="metric-grid">
        <AccountSummary icon={<Building2 size={18} />} label="Department accounts" value={portfolioStats.accounts} />
        <AccountSummary icon={<Activity size={18} />} label="Workers managed" value={portfolioStats.workers} />
        <AccountSummary icon={<ToggleRight size={18} />} label="Inherited toggles" value={portfolioStats.inheritedToggles} />
        <AccountSummary icon={<ShieldCheck size={18} />} label="Active shadow sessions" value={portfolioStats.shadowSessions} />
      </div>

      <div className="account-workspace">
        <AccountDirectory
          accounts={accountList}
          customers={customers}
          selectedAccountId={selectedAccount.id}
          onSelectAccount={setSelectedAccountId}
        />

        <div className="detail-stack">
          <AccountInsightsPanel
            account={selectedAccount}
            auditEvents={selectedAuditEvents}
            groups={groups}
            shadowLoginPolicy={shadowLoginPolicy}
            toggles={featureToggles}
          />

          <AccountRelationships
            account={selectedAccount}
            customer={customer}
            groups={groups}
            siblingAccounts={siblingAccounts}
            allGroups={groupList}
            icon={<Network aria-hidden="true" size={19} />}
            onSetGroupMembership={handleSetGroupMembership}
          />

          <FeatureTogglePanel toggles={featureToggles} onChangeToggleState={handleChangeToggleState} />

          <div className="split-grid">
            <ShadowLoginPanel
              accountName={selectedAccount.name}
              onEndSession={handleEndShadowSession}
              onStartSession={handleStartShadowSession}
              policy={shadowLoginPolicy}
            />
            <AuditTimeline events={selectedAuditEvents} />
          </div>
        </div>
      </div>

      {isNewAccountModalOpen ? (
        <NewAccountModal
          customer={customer}
          onClose={() => setIsNewAccountModalOpen(false)}
          onCreateAccount={handleCreateAccount}
        />
      ) : null}
    </section>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createDefaultFeatureToggles() {
  return [
    {
      id: "egje-export",
      label: "EGJE export",
      area: "Exports" as const,
      state: "disabled" as const,
      inheritedFrom: null,
      risk: "medium" as const,
      updatedBy: "System",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "generator-v2",
      label: "Generator V2",
      area: "Scheduling" as const,
      state: "disabled" as const,
      inheritedFrom: null,
      risk: "high" as const,
      updatedBy: "System",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "customer-shadow-login",
      label: "Customer shadow login",
      area: "Security" as const,
      state: "disabled" as const,
      inheritedFrom: null,
      risk: "high" as const,
      updatedBy: "System",
      updatedAt: new Date().toISOString(),
    },
  ];
}
