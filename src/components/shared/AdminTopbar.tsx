"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/events", label: "Event" },
  { href: "/bookings", label: "Booking" },
  { href: "/refunds", label: "Refund", count: 5 },
  { href: "/checkin", label: "Check-in" },
  { href: "/reports", label: "Laporan" },
];

const active = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/* Navbar pil melayang seperti .header-inner customer. Path dibaca di efek, bukan usePathname,
   supaya layout server tidak menunggu URL dan header tidak tertahan di Suspense. */
export function AdminTopbar() {
  const [path, setPath] = useState("/");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setPath(window.location.pathname);
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="topbar-wrap">
      <div className="topbar">
        <Link href="/" className="brand" aria-label="Dashboard Summarecon">
          <span className="brand-mark">
            <svg viewBox="-130 -135 260 145" aria-hidden="true">
              {[-66, -44, -22, 0, 22, 44, 66].map((a) => (
                <path key={a} d="M0 0C-26-34-24-84 0-118 24-84 26-34 0 0Z" transform={`rotate(${a})`} />
              ))}
            </svg>
          </span>
          <span className="brand-name">Summarecon</span>
          <span className="brand-role">Admin</span>
        </Link>

        <nav className="main-nav" aria-label="Navigasi admin">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={active(path, item.href) ? "page" : undefined}>
              {item.label}
              {item.count ? <span className="nav-count">{item.count}</span> : null}
            </Link>
          ))}
        </nav>

        <div className="topbar-user">
          <span>Arkan P.</span>
          <button type="button" className="icon-button" onClick={toggleTheme} aria-label="Ganti tema" title="Ganti tema">
            {dark ? "\u2600" : "\u263e"}
          </button>
        </div>
      </div>
    </div>
  );
}
