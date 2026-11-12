"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* Halaman login admin. Sengaja tanpa sidebar: satu tombol utama, satu tujuan. */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, audience: "ADMIN" }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? "Gagal masuk. Coba lagi.");
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
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

        <span className="eyebrow">
          <i className="eyebrow-line" />
          Panel internal
        </span>
        <h1 className="page-title" style={{ fontSize: 26, marginTop: 8 }}>
          Masuk ke dashboard
        </h1>
        <p className="page-lead" style={{ marginBottom: 20 }}>
          Akun admin dan petugas check-in memakai halaman yang sama. Hak akses ditentukan oleh role.
        </p>

        {/* method="post" + action sebagai jaring pengaman: kalau hidrasi gagal
            (JS diblokir, chunk gagal dimuat), browser tidak boleh jatuh ke GET
            dan menaruh email+password di URL. Server menolak POST ke /login,
            jadi tidak ada jalur login lewat HTML murni. */}
        <form onSubmit={submit} method="post" action="/login" noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@summarecon.test"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="button button-primary button-block" disabled={busy}>
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <p className="login-foot">Summarecon Mall · Bandung</p>
      </div>
    </div>
  );
}
