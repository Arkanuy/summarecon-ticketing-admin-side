import type { ReactNode } from "react";
import { AdminTopbar } from "@/components/shared/AdminTopbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <AdminTopbar />
      <main className="page">{children}</main>
    </div>
  );
}
