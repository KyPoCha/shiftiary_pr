import { CalendarClock, ShieldCheck, UsersRound } from "lucide-react";
import { Badge } from "../../../shared/components/Badge";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import type { Account, AccountGroup, AuditEvent, FeatureToggle, ShadowLoginPolicy } from "../types";

type AccountInsightsPanelProps = {
  account: Account;
  groups: AccountGroup[];
  toggles: FeatureToggle[];
  shadowLoginPolicy: ShadowLoginPolicy;
  auditEvents: AuditEvent[];
};

export function AccountInsightsPanel({
  account,
  groups,
  toggles,
  shadowLoginPolicy,
  auditEvents,
}: AccountInsightsPanelProps) {
  const enabledHighRiskToggles = toggles.filter(
    (toggle) => toggle.risk === "high" && toggle.state === "enabled",
  ).length;
  const inheritedToggles = toggles.filter((toggle) => toggle.state === "inherited").length;
  const recentWarnings = auditEvents.filter((event) => event.severity !== "info").length;
  const workerDensity = Math.round(account.workers / Math.max(account.seats, 1));
  const healthTone = enabledHighRiskToggles > 0 || shadowLoginPolicy.activeSessionCount > 0 ? "warning" : "success";
  const healthLabel = healthTone === "warning" ? "Needs review" : "Stable";

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Account Overview</h2>
          <span>{account.name} operational context</span>
        </div>
        <div className="panel-heading-actions">
          <Badge tone={healthTone}>{healthLabel}</Badge>
          <ContextHelpButton topicId="account-overview" />
        </div>
      </div>

      <div className="insight-grid">
        <div className="insight-cell">
          <UsersRound aria-hidden="true" size={18} />
          <span>Scale</span>
          <strong>{account.workers} workers</strong>
          <small>{account.seats} seats, about {workerDensity} workers per seat</small>
        </div>

        <div className="insight-cell">
          <ShieldCheck aria-hidden="true" size={18} />
          <span>Configuration</span>
          <strong>{toggles.length} features</strong>
          <small>{inheritedToggles} inherited, {enabledHighRiskToggles} high-risk enabled</small>
        </div>

        <div className="insight-cell">
          <CalendarClock aria-hidden="true" size={18} />
          <span>Recent activity</span>
          <strong>{formatRelative(account.lastScheduleGeneratedAt)}</strong>
          <small>{recentWarnings} warning or critical audit events</small>
        </div>
      </div>

      <div className="account-facts">
        <div>
          <span>Owner</span>
          <strong>{account.owner}</strong>
        </div>
        <div>
          <span>Plan</span>
          <strong>{account.plan}</strong>
        </div>
        <div>
          <span>Timezone</span>
          <strong>{account.timezone}</strong>
        </div>
        <div>
          <span>Groups</span>
          <strong>{groups.length || "None"}</strong>
        </div>
      </div>
    </section>
  );
}

function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffDays = Math.max(0, Math.round(diffMs / 86_400_000));

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return `${diffDays} days ago`;
}
