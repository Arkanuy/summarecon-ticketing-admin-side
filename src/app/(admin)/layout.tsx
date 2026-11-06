import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { AdminTopbar } from "@/components/shared/AdminTopbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <AdminSidebar />
      <div className="workspace">
        <AdminTopbar />
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
