import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { AdminTopbar } from "@/components/shared/AdminTopbar";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Layout admin sengaja TIDAK membaca sesi.
 * Dengan cacheComponents, pembacaan cookie di layout menahan seluruh segmen (termasuk children)
 * dan boundary-nya bisa berhenti di fallback. Guard dipasang per halaman lewat requireAdminPage().
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="shell">
          <AdminSidebar />
          <div className="workspace">
            <AdminTopbar />
            <main className="page">{children}</main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
