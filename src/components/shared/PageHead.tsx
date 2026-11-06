import type { ReactNode } from "react";

/* Eyebrow bergaris + judul besar, mengikuti .booking-title-row di customer side. */
export function PageHead({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      {eyebrow ? (
        <span className="eyebrow">
          <i className="eyebrow-line" />
          {eyebrow}
        </span>
      ) : null}
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{title}</h1>
          {lead ? <p className="page-lead">{lead}</p> : null}
        </div>
        {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
    </header>
  );
}
