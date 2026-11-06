"use client";

import { useEffect, useState } from "react";

/* Bar tipis: konteks halaman + aksi. Navigasi ada di sidebar. */
export function AdminTopbar({ userName = "Admin", roleId = "ROLE-ADMIN" }: { userName?: string; roleId?: string }) {
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  };

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
            {userName}
            <small>{roleId === "ROLE-CHECKIN" ? "Petugas check-in" : "Admin"}</small>
          </span>
        </span>
        <button type="button" className="button button-secondary button-small" onClick={logout} disabled={busy}>
          {busy ? "Keluar…" : "Keluar"}
        </button>
      </div>
    </header>
  );
}
