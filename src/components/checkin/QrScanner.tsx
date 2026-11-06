"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { tickets } from "@/lib/data/admin";

type MiniOrder = { id: string; buyer: string; paymentStatus: string };
type Outcome = { kind: "valid" | "used" | "invalid"; line: string; detail: string };

const ICON = { valid: "\u2713", used: "!", invalid: "\u2715" } as const;

export function QrScanner({ orders }: { orders: MiniOrder[] }) {
  const [result, setResult] = useState<Outcome | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  /* §8.6: scan diterima selama jumlah scan < jumlah tiket valid. */
  const scan = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      setResult({ kind: "invalid", line: "Tidak valid", detail: "bukan tiket event ini" });
      return;
    }
    if (order.paymentStatus !== "SUCCESS" && !order.paymentStatus.includes("REFUND")) {
      setResult({ kind: "invalid", line: "Tidak valid", detail: `pembayaran ${order.paymentStatus.toLowerCase()}` });
      return;
    }
    const valid = tickets.filter((t) => t.orderId === orderId && t.status === "ISSUED");
    const used = counts[orderId] ?? 0;
    if (used >= valid.length) {
      setResult({ kind: "used", line: "Sudah digunakan", detail: `18.42 · scan ${used}/${valid.length}` });
      return;
    }
    const ticket = valid[used];
    setCounts((prev) => ({ ...prev, [orderId]: used + 1 }));
    setResult({
      kind: "valid",
      line: "Valid",
      detail: `${ticket.seat ?? ticket.category} · ${ticket.name} · ${used + 1}/${valid.length}`,
    });
  };

  return (
    <>
      <Card>
        <div className="card-head">
          <div>
            <span className="eyebrow">
              <i className="eyebrow-line" />
              Pemindai QR
            </span>
            <h2 className="section-title" style={{ marginTop: 8 }}>
              Layar scan panitia
            </h2>
          </div>
          <span className="badge badge-muted">
            <i className="dot" />
            Petugas Gate A
          </span>
        </div>
        <p className="sub" style={{ fontSize: 12, lineHeight: 1.7, marginTop: 4 }}>
          Di lapangan layar ini memakai kamera ponsel. Di prototipe, pilih order untuk mensimulasikan satu scan.
        </p>
        <div className="chips" style={{ marginTop: 14 }}>
          {orders.map((o) => (
            <button key={o.id} type="button" className="chip" onClick={() => scan(o.id)}>
              Scan {o.id}
            </button>
          ))}
        </div>
      </Card>

      {result ? (
        <div className={`res res-${result.kind}`} role="status" aria-live="polite">
          <span className="res-icon" aria-hidden="true">{ICON[result.kind]}</span>
          <span>
            {result.line}
            <small>{result.detail}</small>
          </span>
        </div>
      ) : null}
    </>
  );
}
