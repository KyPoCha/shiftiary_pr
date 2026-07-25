import { Badge } from "../../../shared/components/Badge";
import { useMemo, useState } from "react";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import type { AuditEvent } from "../types";

type AuditTimelineProps = {
  events: AuditEvent[];
};

const severityTone = {
  info: "info",
  warning: "warning",
  critical: "danger",
} as const;

type AuditFilter = "all" | AuditEvent["severity"];

const filters: AuditFilter[] = ["all", "info", "warning", "critical"];

export function AuditTimeline({ events }: AuditTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<AuditFilter>("all");
  const visibleEvents = useMemo(
    () => events.filter((event) => activeFilter === "all" || event.severity === activeFilter),
    [activeFilter, events],
  );

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Audit History</h2>
          <span>{visibleEvents.length} of {events.length} recent events</span>
        </div>
        <ContextHelpButton topicId="audit-history" />
      </div>

      <div className="audit-filters" aria-label="Audit severity filter">
        {filters.map((filter) => (
          <button
            aria-pressed={activeFilter === filter}
            className={activeFilter === filter ? "is-selected" : undefined}
            key={filter}
            onClick={() => setActiveFilter(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="audit-list">
        {visibleEvents.length === 0 ? (
          <div className="empty-state">No recent account events.</div>
        ) : (
          visibleEvents.map((event) => (
            <article className="audit-item" key={event.id}>
              <div>
                <strong>{event.action}</strong>
                <span>
                  {event.actor} to {event.target}
                </span>
                <small>{formatDate(event.createdAt)}</small>
              </div>
              <Badge tone={severityTone[event.severity]}>{event.severity}</Badge>
            </article>
          ))
        )}
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
