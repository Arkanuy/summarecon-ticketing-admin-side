"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PetalMark } from "@/components/shared/PetalMark";

const GROUPS = [
  {
    title: "Utama",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/events", label: "Event" },
      { href: "/bookings", label: "Booking" },
      { href: "/refunds", label: "Refund", count: 5 },
    ],
  },
  {
    title: "Operasional",
    items: [
      { href: "/checkin", label: "Check-in" },
      { href: "/venues", label: "Venue" },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { href: "/users", label: "Pengguna" },
      { href: "/reports", label: "Laporan" },
    ],
  },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <PetalMark size={28} />
        <div>
          Summarecon
          <small>Admin</small>
        </div>
      </div>
      <nav aria-label="Navigasi admin">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="nav-group">{group.title}</div>
            <div className="nav-list">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="nav-item" aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                  <span>{item.label}</span>
                  {"count" in item && item.count ? <span className="nav-count">{item.count}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">Summarecon Mall · Bandung</div>
    </aside>
  );
}
