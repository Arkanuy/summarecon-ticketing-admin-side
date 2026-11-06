"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { NavLink } from "@/components/shared/NavLinks";

/** Sama dengan aturan di NavLinks: prefix terpanjang menang, /orders ikut Booking. */
function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function activeHref(pathname: string, hrefs: string[]): string | null {
  const hit = hrefs
    .filter((h) => isActive(pathname, h))
    .sort((a, b) => b.length - a.length)[0];
  if (hit) return hit;
  if (pathname.startsWith("/orders")) return "/bookings";
  if (pathname.startsWith("/refunds")) return "/refunds";
  return null;
}

function Icon({ path, className = "nav-icon" }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/** Bottom tab bar untuk ponsel: 4 modul utama + tombol "Lainnya". */
export function MobileTabBar({
  tabs,
  allHrefs,
  onMore,
}: {
  tabs: NavLink[];
  allHrefs: string[];
  onMore: () => void;
}) {
  const pathname = usePathname();
  const current = activeHref(pathname, allHrefs);
  const isExtra = current !== null && !tabs.some((t) => t.href === current);

  return (
    <nav className="tabbar" aria-label="Navigasi utama ponsel">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className="tab-item" aria-current={current === tab.href ? "page" : undefined}>
          <Icon path={tab.icon} className="tab-icon" />
          <span>{tab.label}</span>
        </Link>
      ))}
      <button type="button" className="tab-item" data-extra={isExtra || undefined} onClick={onMore}>
        <Icon path="M4 6h16M4 12h16M4 18h16" className="tab-icon" />
        <span>Lainnya</span>
      </button>
    </nav>
  );
}

/** Drawer dari bawah untuk modul yang tidak masuk tab bar. */
export function MobileDrawer({
  open,
  onClose,
  groups,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  groups: { title: string; items: NavLink[] }[];
  footer: string;
}) {
  const pathname = usePathname();
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const current = activeHref(pathname, allHrefs);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu lainnya" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-grip" aria-hidden="true" />
        {groups.map((g) => (
          <div key={g.title}>
            <div className="nav-group" style={{ padding: "12px 4px 6px" }}>
              {g.title}
            </div>
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="drawer-item"
                aria-current={current === item.href ? "page" : undefined}
                onClick={onClose}
              >
                <Icon path={item.icon} className="drawer-icon" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
        <div className="drawer-foot">{footer}</div>
      </div>
    </div>
  );
}
