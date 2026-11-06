"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export function AdminTopbar() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="topbar">
      <div className="who">
        Masuk sebagai <strong>Arkan Pratama</strong> · Admin
      </div>
      <div className="topbar-actions">
        <Button variant="outline" size="sm" onClick={toggle} aria-pressed={dark}>
          {dark ? "Mode terang" : "Mode gelap"}
        </Button>
        <Button variant="outline" size="sm">
          Keluar
        </Button>
      </div>
    </div>
  );
}
