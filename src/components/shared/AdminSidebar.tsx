"use client";

import { useEffect, useState } from "react";
import { NavLinks, type NavLink } from "@/components/shared/NavLinks";
import { MobileTabBar, MobileDrawer } from "@/components/shared/MobileNav";

const GROUPS: { title: string; items: NavLink[] }[] = [
  {
    title: "Operasional",
    items: [
      { href: "/", label: "Dashboard", icon: "M3 10h6v10H3zM11 3h6v17h-6z" },
      { href: "/events", label: "Event", icon: "M4 5h16v14H4zM4 9h16" },
      { href: "/bookings", label: "Booking", icon: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" },
      { href: "/refunds", label: "Refund", icon: "M4 12a8 8 0 1 0 3-6.2M4 4v4h4" },
    ],
  },
  {
    title: "Lapangan",
    items: [
      { href: "/checkin", label: "Check-in", icon: "M4 7V4h4M20 7V4h-4M4 17v3h4M20 17v3h-4M7 12h4l2 2 4-5" },
      { href: "/venues", label: "Venue", icon: "M3 20V9l9-5 9 5v11M9 20v-6h6v6" },
    ],
  },
  {
    title: "Laporan & akses",
    items: [
      { href: "/reports", label: "Laporan", icon: "M4 19h16M7 15V9M12 15V5M17 15v-4" },
      { href: "/users", label: "Pengguna", icon: "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" },
      { href: "/api-docs", label: "API & Data", icon: "M4 6h16v12H4zM4 10h16M8 14h4" },
    ],
  },
];

/** Empat tab utama untuk bottom bar ponsel; sisanya lewat tombol "Lainnya". */
const TAB_HREFS = ["/", "/events", "/bookings", "/checkin"];

export function AdminSidebar() {
  const [roleId, setRoleId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setRoleId(d?.data?.role === "CHECK_IN_STAFF" ? "ROLE-CHECKIN" : "ROLE-ADMIN"))
      .catch(() => alive && setRoleId("ROLE-ADMIN"));
    return () => {
      alive = false;
    };
  }, []);

  const isOfficer = roleId === "ROLE-CHECKIN";
  const groups = isOfficer ? GROUPS.filter((g) => g.title === "Lapangan") : GROUPS;
  const all: NavLink[] = groups.flatMap((g) => g.items);
  const tabs = all.filter((i) => TAB_HREFS.includes(i.href));

  return (
    <>
      {/* Desktop: sidebar vertikal */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">
            <svg viewBox="-130 -135 260 145" aria-hidden="true">
              {[-66, -44, -22, 0, 22, 44, 66].map((a) => (
                <path key={a} d="M0 0C-26-34-24-84 0-118 24-84 26-34 0 0Z" transform={`rotate(${a})`} />
              ))}
            </svg>
          </span>
          <span>
            <b>Summarecon</b>
            <small>Admin</small>
          </span>
        </div>

        <nav aria-label="Navigasi admin">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="nav-group">{group.title}</div>
              <NavLinks items={group.items} />
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          Summarecon Mall · Bandung
          <br />
          {isOfficer ? "Petugas check-in" : "Admin"}
        </div>
      </aside>

      {/* Ponsel: bottom tab bar + drawer untuk modul lain */}
      <MobileTabBar tabs={tabs} allHrefs={all.map((i) => i.href)} onMore={() => setDrawer(true)} />
      <MobileDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        groups={groups}
        footer={isOfficer ? "Petugas check-in" : "Admin"}
      />
    </>
  );
}
