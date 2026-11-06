"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; icon: string; count?: number };

/** Aturan aktif: "/" hanya untuk root, lainnya prefix terpanjang menang. */
function pickActive(pathname: string, items: NavLink[]): string | null {
  const candidates = items
    .filter((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length);

  // /orders/* dan /refunds/* bukan menu utama; keduanya menempel ke parent-nya
  if (candidates.length) return candidates[0].href;
  if (pathname.startsWith("/orders")) return "/bookings";
  if (pathname.startsWith("/refunds")) return "/refunds";
  return null;
}

export function NavLinks({ items }: { items: NavLink[] }) {
  const pathname = usePathname();
  const active = pickActive(pathname, items);

  return (
    <div className="nav-list">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-item"
          aria-current={active === item.href ? "page" : undefined}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={item.icon} />
          </svg>
          <span>{item.label}</span>
          {item.count ? <span className="nav-count">{item.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}
