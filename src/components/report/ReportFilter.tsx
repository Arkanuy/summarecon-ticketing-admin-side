"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Filter periode laporan. Preset mengisi tanggal, lalu URL yang menyimpan state. */
export function ReportFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);

  const apply = (a: string, b: string) => {
    const params = new URLSearchParams();
    if (a) params.set("from", a);
    if (b) params.set("to", b);
    router.push(`/reports${params.toString() ? `?${params}` : ""}`);
  };

  const preset = (days: number) => {
    const now = new Date();
    const s = new Date(now);
    s.setDate(now.getDate() - days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setStart(fmt(s));
    setEnd(fmt(now));
    apply(fmt(s), fmt(now));
  };

  return (
    <div className="card">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="from">Dari tanggal</label>
          <input id="from" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="to">Sampai tanggal</label>
          <input id="to" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Button size="small" onClick={() => apply(start, end)}>Terapkan</Button>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
          <Button variant="secondary" size="small" onClick={() => preset(7)}>7 hari</Button>
          <Button variant="secondary" size="small" onClick={() => preset(30)}>30 hari</Button>
          <Button variant="secondary" size="small" onClick={() => { setStart(""); setEnd(""); apply("", ""); }}>Semua</Button>
        </div>
      </div>
    </div>
  );
}
