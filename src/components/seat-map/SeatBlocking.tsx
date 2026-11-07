"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/Toast";
import type { SeatStatus } from "@/types/admin";

const LABEL: Record<SeatStatus, string> = {
  available: "tersedia",
  hold: "sedang dipesan",
  sold: "terjual",
  blocked: "diblokir",
};

const CLASS: Record<SeatStatus, string> = {
  available: "",
  hold: "seat-held",
  sold: "seat-sold",
  blocked: "seat-blocked",
};

/**
 * Admin memblokir/melepas kursi.
 * Kursi yang diblokir TETAP bisa dipilih supaya bisa dilepas; kursi terjual/ditahan tidak.
 */
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
  const confirm = useConfirm();
  const toast = useToast();
  const [state, setState] = useState<Record<string, SeatStatus>>(seats);
  const [selected, setSelected] = useState<string[]>([]);

  const seatId = (row: string, n: number) => `${row}-${String(n).padStart(2, "0")}`;
  const selectable = (s: SeatStatus) => s === "available" || s === "blocked";

  const toggle = (seat: string) =>
    setSelected((prev) => (prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]));

  const picking = selected.map((id) => state[id] ?? "available");
  const canBlock = picking.length > 0 && picking.every((s) => s === "available");
  const canRelease = picking.length > 0 && picking.every((s) => s === "blocked");

  const commit = async (target: "blocked" | "available") => {
    const count = selected.length;
    const agreed = await confirm({
      title: target === "blocked" ? `Blokir ${count} kursi?` : `Lepas blokir ${count} kursi?`,
      description:
        target === "blocked"
          ? "Kursi terblokir tidak bisa dipilih peserta dan kapasitas area dihitung ulang (§6.2 no.14–16)."
          : "Kursi akan kembali tersedia dan bisa dipesan peserta.",
      confirmLabel: target === "blocked" ? "Ya, blokir" : "Ya, lepas",
      tone: target === "blocked" ? "danger" : "default",
    });
    if (!agreed) {
      toast("Dibatalkan, kursi tidak berubah.", "info");
      return;
    }

    setState((prev) => {
      const copy = { ...prev };
      for (const seat of selected) {
        const now = copy[seat] ?? "available";
        if (target === "blocked" && now === "available") copy[seat] = "blocked";
        if (target === "available" && now === "blocked") copy[seat] = "available";
      }
      return copy;
    });
    setSelected([]);
    toast(target === "blocked" ? `${count} kursi diblokir.` : `${count} kursi dibuka kembali.`, "ok");
  };

  const counts = Object.values(state).reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="seat-panel" aria-label={`Denah kursi ${eventId}`}>
      <div className="card-head" style={{ marginBottom: 8 }}>
        <h2 className="section-title">Denah kursi</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" size="small" disabled={!canRelease} onClick={() => commit("available")}>
            Lepas blokir
          </Button>
          <Button variant="primary" size="small" disabled={!canBlock} onClick={() => commit("blocked")}>
            Blokir kursi
          </Button>
        </div>
      </div>

      <div className="stage">PANGGUNG</div>

      <div className="seat-map">
        {rows.map((row) => (
          <div className="seat-row" key={`${eventId}-${row}`}>
            <span className="row-label">{row}</span>
            {Array.from({ length: cols }, (_, i) => {
              const n = i + 1;
              const id = seatId(row, n);
              const status = state[id] ?? "available";
              const isSel = selected.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`seat${CLASS[status] ? ` ${CLASS[status]}` : ""}${isSel ? " seat-selected" : ""}`}
                  aria-pressed={isSel}
                  aria-label={`Kursi ${id} ${LABEL[status]}`}
                  title={`${id} · ${LABEL[status]}${status === "blocked" ? " · klik untuk dilepas" : ""}`}
                  disabled={!selectable(status)}
                  onClick={() => toggle(id)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="seat-legend">
        <span><i className="legend-seat" /> Tersedia ({counts.available ?? 0})</span>
        <span><i className="legend-seat legend-held" /> Sedang dipesan ({counts.hold ?? 0})</span>
        <span><i className="legend-seat legend-sold" /> Terjual ({counts.sold ?? 0})</span>
        <span><i className="legend-seat legend-blocked" /> Diblokir ({counts.blocked ?? 0})</span>
        <span><i className="legend-seat legend-selected" /> Pilihanmu</span>
      </div>

      <p className="seat-sum">
        {selected.length ? `${selected.length} kursi dipilih · ${[...selected].sort().join(", ")}` : "Belum ada kursi dipilih"}
      </p>
      <p className="seat-note">
        Kursi diblokir bisa diklik untuk dilepas. Kursi terjual atau sedang ditahan tidak bisa diubah.
      </p>
    </section>
  );
}
