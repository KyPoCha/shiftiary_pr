import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, DatabaseZap, KeyRound, Network, Search, ShieldCheck, ToggleRight } from "lucide-react";
import { Badge } from "../../../shared/components/Badge";
import { useAdminData } from "../../../shared/api/adminDataStore";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import { AccountDirectory } from "./AccountDirectory";
import { AccountInsightsPanel } from "./AccountInsightsPanel";
import { AccountRelationships } from "./AccountRelationships";
import { AccountSummary } from "./AccountSummary";
import { AuditTimeline } from "./AuditTimeline";
import { FeatureTogglePanel } from "./FeatureTogglePanel";
import { NewAccountModal, type NewAccountDraft } from "./NewAccountModal";
import { ShadowLoginPanel } from "./ShadowLoginPanel";
import type { Customer, FeatureToggleState } from "../types";

export function CustomerAccountsPage() {
  const {
    data,
    changeToggleState,
    createAccount,
    endShadowSession,
    resetAdminData,
    setGroupMembership,
    startShadowSession,
  } = useAdminData();
  const { accountGroups: groupList, accounts: accountList, auditEvents: accountAuditEvents, customers, featureTogglesByAccount, shadowLoginPolicies } = data;
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0].id);
  const customerAccounts = accountList.filter((account) => account.customerId === selectedCustomerId);
  const [selectedAccountId, setSelectedAccountId] = useState(customerAccounts[0]?.id ?? accountList[0].id);
  const selectedAccount = accountList.find((account) => account.id === selectedAccountId) ?? accountList[0];

  const customer = customers.find((item) => item.id === selectedAccount.customerId) ?? customers[0];
  const groups = groupList.filter((group) => selectedAccount.groupIds.includes(group.id));
  const siblingAccounts = accountList.filter(
    (account) => account.customerId === selectedAccount.customerId && account.id !== selectedAccount.id,
  );
  const featureToggles = featureTogglesByAccount[selectedAccount.id] ?? [];
  const shadowLoginPolicy = shadowLoginPolicies[selectedAccount.id];
  const selectedAuditEvents = accountAuditEvents.filter((event) => event.accountId === selectedAccount.id);

  useEffect(() => {
    const nextAccount = accountList.find((account) => account.customerId === selectedCustomerId);

    if (nextAccount && selectedAccount.customerId !== selectedCustomerId) {
      setSelectedAccountId(nextAccount.id);
    }
  }, [accountList, selectedAccount.customerId, selectedCustomerId]);

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

  function handleChangeToggleState(toggleId: string, state: FeatureToggleState) {
    const inheritedFrom = state === "inherited" ? groups[0]?.name ?? "Customer defaults" : null;
    changeToggleState(selectedAccount.id, toggleId, state, inheritedFrom);
  }

  function handleSetGroupMembership(groupId: string, shouldJoin: boolean) {
    setGroupMembership(selectedAccount.id, groupId, shouldJoin);
  }

  function handleStartShadowSession(reason?: string) {
    startShadowSession(selectedAccount.id, reason);
  }

  function handleEndShadowSession() {
    endShadowSession(selectedAccount.id);
  }

  function handleCreateAccount(draft: NewAccountDraft) {
    const account = createAccount({ ...draft, customerId: customer.id });
    setSelectedCustomerId(customer.id);
    setSelectedAccountId(account.id);
    setIsNewAccountModalOpen(false);
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
          <button className="button button-secondary" onClick={resetAdminData} type="button">
            <DatabaseZap aria-hidden="true" size={17} />
            Reset data
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
        <div className="generator-side-stack">
          <CustomerSelector
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            accountCountByCustomer={Object.fromEntries(
              customers.map((item) => [
                item.id,
                accountList.filter((account) => account.customerId === item.id).length,
              ]),
            )}
            onSelectCustomer={setSelectedCustomerId}
          />
          <AccountDirectory
            accounts={customerAccounts}
            customers={customers}
            selectedAccountId={selectedAccount.id}
            onSelectAccount={setSelectedAccountId}
          />
        </div>

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

function CustomerSelector({
  customers,
  selectedCustomerId,
  accountCountByCustomer,
  onSelectCustomer,
}: {
  customers: Customer[];
  selectedCustomerId: string;
  accountCountByCustomer: Record<string, number>;
  onSelectCustomer: (customerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCustomers = normalizedQuery
    ? customers.filter((customer) =>
        [customer.name, customer.legalName, customer.contractTier, customer.region]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : customers;

  return (
    <aside className="account-directory" aria-label="Customer directory">
      <div className="panel-heading">
        <div>
          <h2>Customers</h2>
          <span>{visibleCustomers.length} of {customers.length} tenants</span>
        </div>
        <ContextHelpButton topicId="customer-directory" />
      </div>

      <label className="search-field">
        <Search aria-hidden="true" size={16} />
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer, tier, region"
          type="search"
          value={query}
        />
      </label>

      <div className="account-list">
        {visibleCustomers.length ? (
          visibleCustomers.map((customer) => (
            <button
              className={`account-list-item${selectedCustomerId === customer.id ? " is-selected" : ""}`}
              key={customer.id}
              onClick={() => onSelectCustomer(customer.id)}
              type="button"
            >
              <div>
                <strong>{customer.name}</strong>
                <span>{accountCountByCustomer[customer.id] ?? 0} accounts, {customer.region}</span>
              </div>
              <Badge tone={customer.contractTier === "enterprise" ? "success" : customer.contractTier === "pilot" ? "warning" : "info"}>
                {customer.contractTier}
              </Badge>
            </button>
          ))
        ) : (
          <div className="empty-state">
            <Building2 aria-hidden="true" size={22} />
            <strong>No customers found</strong>
            <span>Try a hospital name, tier, or region.</span>
          </div>
        )}
      </div>
    </aside>
  );
}
