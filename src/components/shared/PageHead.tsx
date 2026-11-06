import type { ReactNode } from "react";

export function PageHead({ overline, title, lead, actions }: { overline?: string; title: string; lead?: string; actions?: ReactNode }) {
  return (
    <header style={{ marginBottom: 20 }}>
      {overline ? <div className="overline">{overline}</div> : null}
      <h1 className="page-title">{title}</h1>
      {lead ? <p className="page-lead">{lead}</p> : null}
      {actions ? <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{actions}</div> : null}
    </header>
  );
}
