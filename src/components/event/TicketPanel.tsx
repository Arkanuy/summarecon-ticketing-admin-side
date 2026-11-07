"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TicketRow = {
  ticket_id: string;
  ticket_code: string;
  participant_name: string;
  order_id: string;
  seat: string | null;
  section: string | null;
  category: string | null;
  ticket_status: string;
  attendance_status: string;
};

type Summary = {
  belum_check_in: number;
  sudah_check_in: number;
  qr_issued: number;
  scans_used: number;
  scan_quota: number;
};

const STATUS = [
  { value: "", label: "Semua status" },
  { value: "ISSUED", label: "Belum dipakai" },
  { value: "USED", label: "Sudah dipakai" },
  { value: "REFUNDED", label: "Refund" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const ATTEND = [
  { value: "", label: "Semua kehadiran" },
  { value: "NOT_CHECKED_IN", label: "Belum check-in" },
  { value: "CHECKED_IN", label: "Sudah check-in" },
];

/** Cari tiket & peserta saat hari-H: cari lewat kode/ID/nama, saring status. */
export function TicketPanel({
  eventId,
  initial,
  summary,
}: {
  eventId: string;
  initial: { items: TicketRow[]; total: number };
  summary: Summary;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [attendance, setAttendance] = useState("");
  const [rows, setRows] = useState<TicketRow[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [loading, setLoading] = useState(false);

  /* Debounce supaya tidak memanggil API tiap ketukan. */
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ perPage: "100" });
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (attendance) params.set("attendance", attendance);
      try {
        const res = await fetch(`/api/events/${eventId}/tickets?${params}`, { cache: "no-store" });
        const body = await res.json();
        if (res.ok) {
          setRows(body.data.items);
          setTotal(body.data.meta.total);
        }
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [q, status, attendance, eventId]);

  const hidden = useMemo(
    () => rows.filter((r) => r.attendance_status === "NOT_CHECKED_IN").length,
    [rows],
  );

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="section-title">Tiket & peserta</h2>
        <span className="sub">
          {summary.sudah_check_in} check-in · {summary.belum_check_in} belum · QR {summary.scans_used}/{summary.scan_quota}
        </span>
      </div>

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div className="field" style={{ flex: "1 1 220px" }}>
          <label htmlFor="ticket-q">Cari tiket / peserta / order</label>
          <input
            id="ticket-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="mis. QRREAL-TKT-1, Nadia, ORD-..."
            autoComplete="off"
          />
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="ticket-status">Status tiket</label>
          <select id="ticket-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="ticket-attendance">Kehadiran</label>
          <select id="ticket-attendance" value={attendance} onChange={(e) => setAttendance(e.target.value)}>
            {ATTEND.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>

      <p className="sub" style={{ marginTop: -4, marginBottom: 10 }}>
        {loading ? "Mencari…" : `${rows.length} baris ditampilkan · ${total} cocok · ${hidden} belum check-in di halaman ini`}
      </p>

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Kode tiket</th>
              <th>Peserta</th>
              <th>Order</th>
              <th>Kursi</th>
              <th>Kategori</th>
              <th>Status</th>
              <th>Check-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="empty">Tidak ada tiket yang cocok.</td></tr>
            ) : (
              rows.map((t) => (
                <tr key={t.ticket_id}>
                  <td className="mono">{t.ticket_code}</td>
                  <td>{t.participant_name}</td>
                  <td className="mono">
                    <Link href={`/orders/${t.order_id}`} className="row-link">{t.order_id}</Link>
                  </td>
                  <td className="mono">{t.seat ?? t.section ?? "—"}</td>
                  <td>{t.category ?? "—"}</td>
                  <td>{t.ticket_status}</td>
                  <td>
                    <span className={`badge ${t.attendance_status === "CHECKED_IN" ? "badge-ok" : "badge-muted"}`}>
                      <i className="dot" />
                      {t.attendance_status === "CHECKED_IN" ? "Sudah" : "Belum"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
