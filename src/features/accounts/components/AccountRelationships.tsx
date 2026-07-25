import type { ReactNode } from "react";
import { Badge } from "../../../shared/components/Badge";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import type { Account, AccountGroup, Customer } from "../types";

type AccountRelationshipsProps = {
  account: Account;
  customer: Customer;
  groups: AccountGroup[];
  siblingAccounts: Account[];
  allGroups: AccountGroup[];
  icon: ReactNode;
  onSetGroupMembership: (groupId: string, shouldJoin: boolean) => void;
};

export function AccountRelationships({
  account,
  customer,
  groups,
  siblingAccounts,
  allGroups,
  icon,
  onSetGroupMembership,
}: AccountRelationshipsProps) {
  const availableGroups = allGroups.filter((group) => group.customerId === customer.id);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Account Relationships</h2>
          <span>{account.department} department context</span>
        </div>
        <div className="panel-heading-actions">
          <ContextHelpButton topicId="account-relationships" />
          <div className="panel-heading-icon">{icon}</div>
        </div>
      </div>

      <div className="relationship-grid">
        <div className="relationship-node relationship-node-primary">
          <span>Customer</span>
          <strong>{customer.name}</strong>
          <small>{customer.contractTier} contract</small>
        </div>

        <div className="relationship-node relationship-node-selected">
          <span>Selected account</span>
          <strong>{account.name}</strong>
          <small>{account.workers} workers, {account.seats} seats</small>
        </div>

        <div className="relationship-column">
          <span className="section-label">Groups</span>
          {availableGroups.map((group) => {
            const isMember = groups.some((selectedGroup) => selectedGroup.id === group.id);

            return (
            <div className="mini-row" key={group.id}>
              <div>
                <strong>{group.name}</strong>
                <small>{group.memberAccountIds.length} member accounts</small>
              </div>
              <button
                className="mini-action"
                onClick={() => onSetGroupMembership(group.id, !isMember)}
                type="button"
              >
                {isMember ? "Remove" : "Add"}
              </button>
            </div>
            );
          })}
        </div>

        <div className="relationship-column">
          <span className="section-label">Sibling accounts</span>
          {siblingAccounts.map((sibling) => {
            const sharedGroupCount = allGroups.filter(
              (group) => group.memberAccountIds.includes(account.id) && group.memberAccountIds.includes(sibling.id),
            ).length;

            return (
              <div className="mini-row" key={sibling.id}>
                <div>
                  <strong>{sibling.name}</strong>
                  <small>{sharedGroupCount} shared groups</small>
                </div>
                <Badge tone={sibling.status === "active" ? "success" : "warning"}>{sibling.status}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
