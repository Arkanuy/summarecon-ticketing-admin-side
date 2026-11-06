"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

type Me = { name: string; role: string };

export function AdminTopbar() {
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
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

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  async function logout() {
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

  const initials = (me?.name ?? "Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="topbar">
      <div className="crumbs">
        Admin <span aria-hidden="true">/</span> <b>Summarecon Ticketing</b>
      </div>
      <div className="topbar-actions">
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label="Ganti tema" title="Ganti tema">
          {dark ? "\u2600" : "\u263e"}
        </button>
        <span className="topbar-user">
          <span className="avatar">{initials || "AD"}</span>
          <span className="topbar-user-name">
            {me?.name ?? "Memuat…"}
            <small>{me?.role === "CHECK_IN_STAFF" ? "Petugas check-in" : me ? "Admin" : " "}</small>
          </span>
        </span>
        <button type="button" className="button button-secondary button-small" onClick={logout} disabled={busy}>
          {busy ? "Keluar…" : "Keluar"}
        </button>
      </div>
    </header>
  );
}
