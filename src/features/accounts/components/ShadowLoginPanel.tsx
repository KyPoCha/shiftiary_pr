import { Clock3, LogIn, LogOut, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { IconButton } from "../../../shared/components/IconButton";
import { Badge } from "../../../shared/components/Badge";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import type { ShadowLoginPolicy } from "../types";

type ShadowLoginPanelProps = {
  policy: ShadowLoginPolicy;
  accountName: string;
  onStartSession: (reason?: string) => void;
  onEndSession: () => void;
};

export function ShadowLoginPanel({
  policy,
  accountName,
  onStartSession,
  onEndSession,
}: ShadowLoginPanelProps) {
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();
  const hasRequiredReason = !policy.reasonRequired || trimmedReason.length >= 8;
  const canStartSession = policy.internalAdminsAllowed && hasRequiredReason;

  function handleStartSession() {
    if (!canStartSession) {
      return;
    }

    onStartSession(trimmedReason || undefined);
    setReason("");
    setIsStartModalOpen(false);
  }

  return (
    <section className="panel" id="shadow-login-panel">
      <div className="panel-heading">
        <div>
          <h2>Shadow Login</h2>
          <span>{accountName}</span>
        </div>
        <div className="panel-heading-actions">
          <Badge tone={policy.activeSessionCount > 0 ? "warning" : "success"}>
            {policy.activeSessionCount} active
          </Badge>
          <ContextHelpButton topicId="shadow-login" />
        </div>
      </div>

      <div className="policy-list">
        <div className="policy-item">
          <ShieldAlert aria-hidden="true" size={18} />
          <div>
            <strong>Internal admins</strong>
            <span>{policy.internalAdminsAllowed ? "Allowed with audit" : "Blocked"}</span>
          </div>
        </div>
        <div className="policy-item">
          <ShieldAlert aria-hidden="true" size={18} />
          <div>
            <strong>Customer admins</strong>
            <span>{policy.customerAdminsAllowed ? "Allowed with audit" : "Blocked"}</span>
          </div>
        </div>
        <div className="policy-item">
          <Clock3 aria-hidden="true" size={18} />
          <div>
            <strong>Session limit</strong>
            <span>
              {policy.maxSessionMinutes} minutes, reason {policy.reasonRequired ? "required" : "optional"}
            </span>
          </div>
        </div>
      </div>

      <div className="panel-actions">
        <IconButton
          disabled={!policy.internalAdminsAllowed}
          icon={<LogIn aria-hidden="true" size={16} />}
          label="Start session"
          onClick={() => setIsStartModalOpen(true)}
          variant="primary"
        />
        <IconButton
          disabled={policy.activeSessionCount === 0}
          icon={<LogOut aria-hidden="true" size={16} />}
          label="End session"
          onClick={onEndSession}
        />
      </div>

      {isStartModalOpen ? (
        <div aria-labelledby="shadow-login-title" aria-modal="true" className="modal-backdrop" role="dialog">
          <div className="modal-panel modal-panel-compact">
            <div className="modal-header">
              <div>
                <h2 id="shadow-login-title">Start Shadow Login</h2>
                <span>{accountName}</span>
              </div>
              <button
                aria-label="Close"
                className="icon-only-button"
                onClick={() => setIsStartModalOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="modal-summary">
              <strong>Audited support session</strong>
              <span>
                You will enter this account for up to {policy.maxSessionMinutes} minutes.
                Reason is {policy.reasonRequired ? "required by policy" : "optional for SLA support"}.
              </span>
            </div>

            <label className="field-stack">
              <span>Session reason {policy.reasonRequired ? "" : "(optional)"}</span>
              <textarea
                autoFocus
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional context, ticket, or customer request"
                rows={3}
                value={reason}
              />
              <small>
                {policy.reasonRequired
                  ? "Enter at least 8 characters to start this session."
                  : "You can leave this empty if the support policy allows it."}
              </small>
            </label>

            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setIsStartModalOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={!canStartSession}
                onClick={handleStartSession}
                type="button"
              >
                Start session
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
