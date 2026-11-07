"use client";

import { useCallback, useEffect, useState } from "react";

type Payload = {
  table: string;
  total: number;
  shown: number;
  columns: string[];
  rows: Record<string, unknown>[];
  tables: string[];
};

/** Penampil database: pilih tabel, cari isi, lihat kolomnya. */
export function DbViewer({ initialTables }: { initialTables: string[] }) {
  const [table, setTable] = useState(initialTables[0] ?? "venues");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (name: string, query: string) => {
    setBusy(true);
    setError(null);
    const params = new URLSearchParams({ table: name, take: "50" });
    if (query.trim()) params.set("q", query.trim());
    try {
      const res = await fetch(`/api/admin/db?${params}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Gagal membaca database");
        setData(null);
      } else setData(body.data);
    } catch {
      setError("Gagal terhubung ke API");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(table, q), 250);
    return () => clearTimeout(timer);
  }, [table, q, load]);

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <h2 className="section-title">Penampil database</h2>
        <span className="sub">
          {data ? `${data.shown} dari ${data.total} baris` : busy ? "memuat…" : "—"}
        </span>
      </div>

      <div className="toolbar">
        <div className="field" style={{ minWidth: 180 }}>
          <label htmlFor="db-table">Tabel</label>
          <select id="db-table" value={table} onChange={(e) => setTable(e.target.value)}>
            {(data?.tables ?? initialTables).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: "1 1 240px" }}>
          <label htmlFor="db-q">Cari isi</label>
          <input
            id="db-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="mis. Bandung, PAID, QRREAL"
            autoComplete="off"
          />
        </div>
      </div>

      {error ? <div className="note" style={{ borderLeftColor: "var(--error)" }}>{error}</div> : null}

      {data && data.rows.length ? (
        <div style={{ overflowX: "auto", maxHeight: "60vh" }}>
          <table className="table">
            <thead>
              <tr>{data.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i}>
                  {data.columns.map((c) => {
                    const v = row[c];
                    const text =
                      v === null || v === undefined
                        ? "—"
                        : typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v);
                    return (
                      <td key={c} className={typeof v === "number" ? "num mono" : "mono"} title={text}>
                        <span style={{ display: "inline-block", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
                          {text}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : data ? (
        <p className="sub">Tabel ini kosong.</p>
      ) : null}

      <p className="sub" style={{ marginTop: 10 }}>
        Kolom sensitif (password, nomor rekening, token, nomor telepon) disamarkan otomatis.
      </p>
    </section>
  );
}
