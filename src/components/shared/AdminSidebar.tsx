"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; icon: string; count?: number };

/* Navigasi utama admin: daftar modul lengkap, selalu terlihat. */
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Operasional",
    items: [
      { href: "/", label: "Dashboard", icon: "M3 10h6v10H3zM11 3h6v17h-6z" },
      { href: "/events", label: "Event", icon: "M4 5h16v14H4zM4 9h16" },
      { href: "/bookings", label: "Booking", icon: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" },
      { href: "/refunds", label: "Refund", icon: "M4 12a8 8 0 1 0 3-6.2M4 4v4h4", count: 5 },
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
    ],
  },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function AdminSidebar({ roleId = "ROLE-ADMIN", roleName = "ADMIN" }: { roleId?: string; roleName?: string }) {
  const [path, setPath] = useState("/");
  /* Petugas check-in hanya melihat modul lapangan. Role dicek dari ID, bukan tebakan nama. */
  const isOfficer = roleId === "ROLE-CHECKIN";

  /* Path dibaca di efek supaya layout server tidak menunggu URL (cacheComponents). */
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return (
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
        {(isOfficer ? GROUPS.filter((g) => g.title === "Lapangan") : GROUPS).map((g) => (
          <div key={g.title}>
            <div className="nav-group">{g.title}</div>
            <div className="nav-list">
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item"
                  aria-current={isActive(path, item.href) ? "page" : undefined}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                  {item.count ? <span className="nav-count">{item.count}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        Summarecon Mall · Bandung
        <br />
        {isOfficer ? "Petugas check-in" : "Admin"}
      </div>
    </aside>
  );
}
