import type { PropsWithChildren } from "react";
import { cn } from "../utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone;
}>;

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}
