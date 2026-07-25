import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../../shared/components/Badge";
import { cn } from "../../../shared/utils/cn";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import type { Account, Customer } from "../types";

type AccountDirectoryProps = {
  accounts: Account[];
  customers: Customer[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
};

export function AccountDirectory({
  accounts,
  customers,
  selectedAccountId,
  onSelectAccount,
}: AccountDirectoryProps) {
  const [query, setQuery] = useState("");
  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return accounts;
    }

    return accounts.filter((account) => {
      const customer = customers.find((item) => item.id === account.customerId);
      return [account.name, account.department, customer?.name, account.owner]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [accounts, customers, query]);

  return (
    <aside className="account-directory" aria-label="Account directory">
      <div className="panel-heading">
        <div>
          <h2>Accounts</h2>
          <span>{filteredAccounts.length} visible</span>
        </div>
        <ContextHelpButton topicId="account-directory" />
      </div>

      <label className="search-field">
        <Search aria-hidden="true" size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search account, owner, hospital"
          type="search"
        />
      </label>

      <div className="account-list">
        {filteredAccounts.map((account) => {
          const customer = customers.find((item) => item.id === account.customerId);

          return (
            <button
              key={account.id}
              className={cn("account-list-item", selectedAccountId === account.id && "is-selected")}
              onClick={() => onSelectAccount(account.id)}
              type="button"
            >
              <div>
                <strong>{account.name}</strong>
                <span>{customer?.name}</span>
              </div>
              <Badge tone={account.status === "active" ? "success" : account.status === "trial" ? "warning" : "neutral"}>
                {account.status}
              </Badge>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
