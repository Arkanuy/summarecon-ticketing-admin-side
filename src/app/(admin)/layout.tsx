import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { AdminTopbar } from "@/components/shared/AdminTopbar";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AutoRefresh } from "@/components/shared/AutoRefresh";
import { SyncStamp } from "@/components/shared/SyncStamp";

/**
 * Layout admin sengaja TIDAK membaca sesi.
 * Dengan cacheComponents, pembacaan cookie di layout menahan seluruh segmen (termasuk children)
 * dan boundary-nya bisa berhenti di fallback. Guard dipasang per halaman lewat requireAdminPage().
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {/* Data peserta (order, kursi, check-in) masuk lewat API; dashboard menyusul sendiri. */}
        <AutoRefresh intervalMs={5000} />
        <div className="shell">
          <AdminSidebar />
          <div className="workspace">
            <AdminTopbar />
            <main className="page">{children}</main>
          </div>
          <SyncStamp />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
