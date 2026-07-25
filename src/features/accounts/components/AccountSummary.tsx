import type { ReactNode } from "react";

type AccountSummaryProps = {
  icon: ReactNode;
  label: string;
  value: number;
};

export function AccountSummary({ icon, label, value }: AccountSummaryProps) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
    </article>
  );
}
