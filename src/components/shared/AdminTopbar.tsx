"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { NavLinks, type NavLink } from "@/components/shared/NavLinks";
import { usePathname } from "next/navigation";

/* Peta judul halaman supaya header memberi tahu posisi, bukan sekadar "Admin / ...". */
const PAGE_TITLES: { match: RegExp; label: string; parent?: { href: string; label: string } }[] = [
  { match: /^\/(events\/[^/]+)?$/, label: "Event" },
  { match: /^\/(bookings|orders\/[^/]+)$/, label: "Booking" },
  { match: /^\/refunds(\/[^/]+)?$/, label: "Refund" },
  { match: /^\/checkin$/, label: "Check-in" },
  { match: /^\/venues$/, label: "Venue" },
  { match: /^\/reports$/, label: "Laporan" },
  { match: /^\/users$/, label: "Pengguna" },
  { match: /^\/$/, label: "Dashboard" },
];

type Me = { name: string; role: string };

export function AdminTopbar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [menu, setMenu] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.data && setMe({ name: d.data.name, role: d.data.role }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  async function logout() {
    setMenu(false);
    const agreed = await confirm({
      title: "Keluar dari dashboard?",
      description: "Sesi di perangkat ini akan dicabut. Kamu perlu masuk lagi untuk melanjutkan.",
      confirmLabel: "Ya, keluar",
      tone: "danger",
    });
    if (!agreed) return;
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const current = PAGE_TITLES.find((p) => p.match.test(pathname))?.label ?? "Dashboard";
  const isDetail = /\/(events|orders|refunds)\/[^/]+$/.test(pathname);
  const parentHref = pathname.startsWith("/orders")
    ? "/bookings"
    : pathname.startsWith("/refunds")
      ? "/refunds"
      : "/events";

  const initials = (me?.name ?? "Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="topbar">
      {/* Kiri: judul halaman sebagai penanda posisi */}
      <div className="topbar-title">
        <span className="topbar-crumb">Admin</span>
        <span className="topbar-sep" aria-hidden="true">
          /
        </span>
        <span className="topbar-current">{current}</span>
        {isDetail ? <span className="topbar-detail">· detail</span> : null}
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button"
          onClick={toggleTheme}
          aria-label={dark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
          title={dark ? "Tema terang" : "Tema gelap"}
        >
          {dark ? "\u2600" : "\u263e"}
        </button>

        <div className="user-menu">
          <button
            type="button"
            className="user-trigger"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
          >
            <span className="avatar">{initials || "AD"}</span>
            <span className="user-copy">
              <b>{me?.name ?? "Memuat…"}</b>
              <small>{me?.role === "CHECK_IN_STAFF" ? "Petugas check-in" : "Admin"}</small>
            </span>
          </button>

          {menu ? (
            <div className="user-pop" role="menu">
              <div className="user-pop-head">
                <b>{me?.name ?? "—"}</b>
                <small>{me?.role === "CHECK_IN_STAFF" ? "Petugas check-in" : "Administrator"}</small>
              </div>
              <button type="button" role="menuitem" className="user-pop-item" onClick={logout} disabled={busy}>
                {busy ? "Keluar…" : "Keluar"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
