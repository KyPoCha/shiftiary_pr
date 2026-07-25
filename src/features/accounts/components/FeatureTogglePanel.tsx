import { ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "../../../shared/components/Badge";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import type { FeatureToggle, FeatureToggleState } from "../types";

type FeatureTogglePanelProps = {
  toggles: FeatureToggle[];
  onChangeToggleState: (toggleId: string, state: FeatureToggleState) => void;
};

const stateTone = {
  enabled: "success",
  disabled: "neutral",
  inherited: "info",
} as const;

const riskTone = {
  low: "success",
  medium: "warning",
  high: "danger",
} as const;

const stateOptions: FeatureToggleState[] = ["enabled", "disabled", "inherited"];

export function FeatureTogglePanel({ toggles, onChangeToggleState }: FeatureTogglePanelProps) {
  const stateCounts = stateOptions.map((state) => ({
    state,
    count: toggles.filter((toggle) => toggle.state === state).length,
  }));
  const highRiskEnabledCount = toggles.filter(
    (toggle) => toggle.risk === "high" && toggle.state === "enabled",
  ).length;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Feature Toggles</h2>
          <span>{toggles.length} configured modules</span>
        </div>
        <div className="panel-heading-actions">
          <Badge tone={highRiskEnabledCount > 0 ? "warning" : "success"}>
            {highRiskEnabledCount} high-risk enabled
          </Badge>
          <ContextHelpButton topicId="feature-toggles" />
        </div>
      </div>

      <div className="toggle-summary" aria-label="Feature toggle distribution">
        {stateCounts.map((item) => (
          <div className="toggle-summary-item" key={item.state}>
            <div>
              <span>{item.state}</span>
              <strong>{item.count}</strong>
            </div>
            <div className="summary-meter">
              <span
                className={`summary-meter-fill summary-meter-${item.state}`}
                style={{ width: `${toggles.length ? (item.count / toggles.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="toggle-table">
        <div className="toggle-row toggle-row-header">
          <span>Module</span>
          <span>State</span>
          <span>Risk</span>
          <span>Last change</span>
        </div>
        {toggles.map((toggle) => (
          <div className="toggle-row" key={toggle.id}>
            <div className="toggle-name">
              {toggle.state === "disabled" ? (
                <ToggleLeft aria-hidden="true" size={20} />
              ) : (
                <ToggleRight aria-hidden="true" size={20} />
              )}
              <div>
                <strong>{toggle.label}</strong>
                <small>{toggle.area}</small>
              </div>
            </div>
            <div>
              <Badge tone={stateTone[toggle.state]}>{toggle.state}</Badge>
              {toggle.inheritedFrom ? <small>from {toggle.inheritedFrom}</small> : null}
            </div>
            <Badge tone={riskTone[toggle.risk]}>{toggle.risk}</Badge>
            <div className="toggle-controls">
              <div className="segmented-control" aria-label={`${toggle.label} state`}>
                {stateOptions.map((state) => (
                  <button
                    aria-pressed={toggle.state === state}
                    className={toggle.state === state ? "is-selected" : undefined}
                    key={state}
                    onClick={() => onChangeToggleState(toggle.id, state)}
                    type="button"
                  >
                    {state}
                  </button>
                ))}
              </div>
              <div className="change-cell">
                <strong>{toggle.updatedBy}</strong>
                <small>{formatDate(toggle.updatedAt)}</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
