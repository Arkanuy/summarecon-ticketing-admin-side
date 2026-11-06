"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { tickets } from "@/lib/data/admin";

type MiniOrder = { id: string; buyer: string; paymentStatus: string };
type Outcome = { kind: "valid" | "used" | "invalid"; line: string; detail: string };

const ICON = { valid: "✓", used: "!", invalid: "✕" } as const;

export function QrScanner({ orders }: { orders: MiniOrder[] }) {
  const [result, setResult] = useState<Outcome | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  /* §8.6: scan diterima selama jumlah scan < jumlah tiket valid. Keempat scan ditolak. */
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
      setResult({ kind: "used", line: "Sudah digunakan", detail: `scan ${used}/${valid.length} · QR tidak dapat dipakai lagi` });
      return;
    }
    const ticket = valid[used];
    setCounts((prev) => ({ ...prev, [orderId]: used + 1 }));
    setResult({ kind: "valid", line: "Valid", detail: `${ticket.name} · ${ticket.seat ?? ticket.category} · scan ${used + 1}/${valid.length}` });
  };

  return (
    <>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="overline">Pemindai QR</div>
            <h2 className="section-title" style={{ marginTop: 4 }}>
              Layar scan panitia
            </h2>
          </div>
          <span className="badge badge-muted">
            <i className="dot" />
            Petugas Gate A
          </span>
        </div>
        <p className="muted" style={{ fontSize: 14, margin: "10px 0 14px" }}>
          Di lapangan layar ini memakai kamera ponsel. Di prototipe, pilih order untuk mensimulasikan satu scan.
        </p>
        <div className="chips">
          {orders.map((order) => (
            <button key={order.id} type="button" className="chip" onClick={() => scan(order.id)}>
              Scan {order.id}
            </button>
          ))}
        </div>
      </Card>

      {result ? (
        <div className={`res ${result.kind}`} role="status" aria-live="polite" style={{ marginTop: 14 }}>
          <span className="res-icon" aria-hidden="true">
            {ICON[result.kind]}
          </span>
          <span>
            {result.line}
            <small>{result.detail}</small>
          </span>
        </div>
      ) : null}
    </>
  );
}
