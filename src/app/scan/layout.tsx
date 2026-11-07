import type { ReactNode } from "react";

export default function ScanLayout({ children }: { children: ReactNode }) {
  return <div className="scan-root">{children}</div>;
}
