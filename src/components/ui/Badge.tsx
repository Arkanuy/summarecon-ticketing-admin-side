import type { HTMLAttributes } from "react";
import { statusTone } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: "ok" | "hold" | "bad" | "primary" | "muted" };

/* Badge §5: garis currentColor + dot, bukan blok warna penuh. */
export function Badge({ className = "", tone, children, ...props }: BadgeProps) {
  return (
    <span className={["badge", tone ? `badge-${tone}` : "badge-primary", className].filter(Boolean).join(" ")} {...props}>
      <i className="dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={statusTone(status)}>{label ?? status}</Badge>;
}

/* Badge ringkas versi dashboard admin (§8): blok warna lembut tanpa garis. */
export function VersionBadge({ status, label }: { status: string; label: string }) {
  const map = { ok: "vd-1", hold: "vd-2", bad: "vd-4", muted: "vd-3", primary: "vd-3" } as const;
  return <span className={`vd ${map[statusTone(status)]}`}>{label}</span>;
}
