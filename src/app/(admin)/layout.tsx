import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { AdminTopbar } from "@/components/shared/AdminTopbar";

/* usePathname() membaca URL, jadi sidebar harus di dalam Suspense (§cacheComponents Next 16). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <Suspense fallback={<aside className="sidebar" aria-hidden="true" />}>
        <AdminSidebar />
      </Suspense>
      <main className="main">
        <AdminTopbar />
        {children}
      </main>
    </div>
  );
}
