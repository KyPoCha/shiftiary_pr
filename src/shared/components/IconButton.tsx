import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  variant?: "primary" | "secondary" | "danger";
};

export function IconButton({
  icon,
  label,
  className,
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <button className={cn("icon-button", `icon-button-${variant}`, className)} title={label} {...props}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
