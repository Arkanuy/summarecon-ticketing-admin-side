"use client";

import { useEffect, useState } from "react";

/* Bar tipis: konteks halaman + aksi. Navigasi ada di sidebar. */
export function AdminTopbar() {
  const [dark, setDark] = useState(false);

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
          <span className="avatar">AP</span>
          Arkan Pratama
        </span>
      </div>
    </header>
  );
}
