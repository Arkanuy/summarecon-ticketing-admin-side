import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { flush?: boolean; padLg?: boolean };

export function Card({ className = "", flush, padLg, ...props }: CardProps) {
  return (
    <div
      className={["card", flush ? "flush" : "", padLg ? "pad-lg" : "", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function StatCard({ label, value, sub, progress }: { label: string; value: string; sub?: string; progress?: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
      {typeof progress === "number" ? (
        <div className="bar">
          <i style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {sub ? <span style={{ display: "block", marginTop: 6 }}>{sub}</span> : null}
    </div>
  );
}
