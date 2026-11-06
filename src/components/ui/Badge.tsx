import type { HTMLAttributes } from "react";
import { statusTone } from "@/lib/utils";

type Tone = "ok" | "hold" | "bad" | "primary" | "muted";
type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

export function Badge({ className = "", tone, children, ...props }: BadgeProps) {
  return (
    <span className={["badge", `badge-${tone ?? "primary"}`, className].filter(Boolean).join(" ")} {...props}>
      <i className="dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={statusTone(status)}>{label ?? status}</Badge>;
}

export function VersionBadge({ status, label }: { status: string; label: string }) {
  const map = { ok: "vd-1", hold: "vd-2", bad: "vd-4", muted: "vd-3", primary: "vd-3" } as const;
  return <span className={`vd ${map[statusTone(status)]}`}>{label}</span>;
}
