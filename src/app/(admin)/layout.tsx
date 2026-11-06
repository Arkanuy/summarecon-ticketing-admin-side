import type { ReactNode } from "react";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { AdminTopbar } from "@/components/shared/AdminTopbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <Suspense fallback={<aside className="sidebar" aria-hidden="true" />}>
        <AdminChrome />
      </Suspense>
      <div className="workspace">
        <Suspense fallback={<header className="topbar" aria-hidden="true" />}>
          <AdminHeader />
        </Suspense>
        <main className="page">
          <Suspense fallback={<p className="muted" style={{ padding: 16 }}>Memuat…</p>}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

async function AdminChrome() {
  const admin = await getCurrentAdmin();
  return <AdminSidebar roleId={admin.roleId} roleName={admin.roleName} />;
}

async function AdminHeader() {
  const admin = await getCurrentAdmin();
  return <AdminTopbar userName={admin.name} roleId={admin.roleId} />;
}
