"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SeatStatus } from "@/types/admin";

const LABEL: Record<SeatStatus, string> = {
  available: "tersedia",
  hold: "sedang dipesan",
  sold: "terjual",
  blocked: "diblokir",
};

const NOTICE: Record<SeatStatus, string> = {
  available: "Rp 350.000",
  hold: "Rp 350.000",
  sold: "Rp 350.000",
  blocked: "Rp 350.000",
};

export function SeatBlocking({
  eventId,
  seats,
  rows,
  cols,
}: {
  eventId: string;
  seats: Record<string, SeatStatus>;
  rows: string[];
  cols: number;
}) {
  const [state, setState] = useState<Record<string, SeatStatus>>(seats);
  const [selected, setSelected] = useState<string[]>([]);

  const id = (row: string, n: number) => `${row}-${String(n).padStart(2, "0")}`;
  const toggle = (seat: string) =>
    setSelected((prev) => (prev.includes(seat) ? prev.filter((x) => x !== seat) : [...prev, seat]));

  /* §6.2 no.14–16: kursi terjual atau sedang ditahan tidak boleh diblokir. */
  const commit = (target: "blocked" | "available") => {
    setState((prev) => {
      const copy = { ...prev };
      for (const seat of selected) {
        if (target === "blocked" && copy[seat] !== "available") continue;
        if (target === "available" && copy[seat] !== "blocked") continue;
        copy[seat] = target;
      }
      return copy;
    });
    setSelected([]);
  };

  const blocked = Object.values(state).filter((s) => s === "blocked").length;

  return (
    <div className="seatbox">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h2 className="section-title">Denah kursi</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" size="sm" disabled={!selected.length} onClick={() => commit("available")}>
            Lepas blokir
          </Button>
          <Button variant="primary" size="sm" disabled={!selected.length} onClick={() => commit("blocked")}>
            Blokir kursi
          </Button>
        </div>
      </div>

      <div className="stage">PANGGUNG</div>

      <div className="seats">
        {rows.map((row) => (
          <div className="seats-row" key={`${eventId}-${row}`}>
            <span className="seats-lbl">{row}</span>
            {Array.from({ length: cols }, (_, index) => {
              const n = index + 1;
              const seat = id(row, n);
              const status = state[seat] ?? "available";
              const isSel = selected.includes(seat);
              return (
                <button
                  key={seat}
                  type="button"
                  className={`s${status === "available" ? "" : ` ${status}`}${isSel ? " sel" : ""}`}
                  aria-pressed={isSel}
                  aria-label={`Kursi ${seat} ${LABEL[status]}`}
                  title={`${seat} · ${LABEL[status]} · ${NOTICE[status]}`}
                  disabled={status !== "available"}
                  onClick={() => toggle(seat)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="legend">
        <span>
          <i style={{ background: "var(--ok)" }} /> Tersedia
        </span>
        <span>
          <i style={{ background: "var(--hold)" }} /> Sedang dipesan
        </span>
        <span>
          <i style={{ background: "var(--sold)" }} /> Terjual
        </span>
        <span>
          <i style={{ background: "repeating-linear-gradient(45deg, var(--sold), var(--sold) 3px, transparent 3px, transparent 6px)", border: "1px solid var(--sold)" }} /> Diblokir
        </span>
        <span>
          <i style={{ background: "var(--primary)" }} /> Pilihanmu
        </span>
      </div>

      <p className="seat-sum">
        {selected.length ? `${selected.length} kursi dipilih · ${selected.sort().join(", ")}` : "Belum ada kursi dipilih"}
      </p>

      <div className="note" style={{ marginBottom: 0 }}>
        {blocked} kursi diblokir. Kursi terblokir tidak bisa dipilih peserta dan kapasitas area dihitung ulang (§6.2
        no.14–16).
      </div>
    </div>
  );
}
