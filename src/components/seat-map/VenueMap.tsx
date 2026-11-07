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

type LayoutElement = {
  element_id?: string;
  name?: string;
  element_type?: string;
  ticketable?: boolean;
  note?: string;
  booking_type?: string;
  position?: { x: number; y: number; width: number; height: number; unit?: string };
};

type Section = {
  id: string;
  name: string;
  bookingType: string;
  capacity: number;
  sold: number;
  sectionId: string;
  /** `${section_id master} ${nama}` huruf kecil, untuk mencocokkan elemen denah. */
  sectionKey: string;
};

/** Warna per jenis elemen, mengikuti legenda blueprint. */
const ELEMENT_STYLE: Record<string, { cls: string; tag?: string }> = {
  STAGE: { cls: "el-stage", tag: "PANGGUNG" },
  BACKSTAGE: { cls: "el-backstage", tag: "BACKSTAGE" },
  TICKET_SECTION: { cls: "el-section" },
  AISLE: { cls: "el-aisle", tag: "AISLE" },
  EMERGENCY_ACCESS: { cls: "el-emergency", tag: "JALUR EVAKUASI" },
  TENANT_AREA: { cls: "el-tenant", tag: "TENANT" },
  ACCESSIBLE_VIEWING: { cls: "el-access", tag: "A11Y" },
  FRONT_OF_HOUSE: { cls: "el-foh", tag: "FOH" },
  CHECK_IN: { cls: "el-checkin", tag: "CHECK-IN" },
  ENTRY: { cls: "el-entry", tag: "MASUK" },
  EXIT: { cls: "el-exit", tag: "KELUAR" },
};

const BOOKING_TAG: Record<string, string> = {
  BOOK_BY_SEAT: "pilih kursi",
  BOOK_BY_QUOTA: "pilih seksi",
  STANDING: "berdiri",
};

/**
 * Denah venue dari data layout template: posisi elemen + grid kursi per section.
 * Kursi diblokir tetap bisa diklik supaya bisa dilepas.
 */
export function VenueMap({
  eventId,
  elements,
  sections,
  seats,
}: {
  eventId: string;
  elements: LayoutElement[];
  sections: Section[];
  seats: { id: string; sectionId: string; row: string; number: number; status: SeatStatus }[];
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [state, setState] = useState<Record<string, SeatStatus>>(
    Object.fromEntries(seats.map((s) => [s.id, s.status])),
  );
  const [selected, setSelected] = useState<string[]>([]);

  const bySection = new Map<string, typeof seats>();
  for (const s of seats) {
    const arr = bySection.get(s.sectionId) ?? [];
    arr.push(s);
    bySection.set(s.sectionId, arr);
  }

  const statusOf = (id: string) => state[id] ?? "available";
  const selectable = (s: SeatStatus) => s === "available" || s === "blocked";

  function toggle(id: string) {
    const s = statusOf(id);
    if (!selectable(s)) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selBlocked = selected.filter((id) => statusOf(id) === "blocked");
  const selFree = selected.filter((id) => statusOf(id) === "available");

  async function commit(next: "available" | "blocked") {
    const ids = next === "blocked" ? selFree : selBlocked;
    if (!ids.length) return;

    const ok = await confirm({
      title: next === "blocked" ? `Blokir ${ids.length} kursi?` : `Lepas blokir ${ids.length} kursi?`,
      description:
        next === "blocked"
          ? "Kursi tidak bisa dipilih peserta sampai blokir dilepas."
          : "Kursi kembali tersedia dan bisa dipesan peserta.",
      confirmLabel: next === "blocked" ? "Ya, blokir" : "Ya, lepas",
      tone: next === "blocked" ? "danger" : "default",
    });
    if (!ok) return;

    const res =
      next === "blocked"
        ? await fetch(`/api/events/${eventId}/seats/block`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_seat_ids: ids, reason: "Blokir manual admin" }),
          })
        : await fetch(
            `/api/events/${eventId}/seats/block?seat_id=${encodeURIComponent(ids[0])}`,
            { method: "DELETE" },
          );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast(body?.error?.message ?? "Gagal mengubah status kursi.", "bad");
      return;
    }

    setState((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, next])) }));
    setSelected([]);
    toast(next === "blocked" ? `${ids.length} kursi diblokir.` : `${ids.length} kursi dilepas.`, "ok");
  }

  /**
   * Kursi digambar dengan ukuran tetap lalu di-scale supaya muat (bukan dipotong).
   * Pendekatan persen bikin baris hilang saat elemen section rendah di kanvas.
   */
  function seatLayout(sectionSeats: typeof seats) {
    return [...new Set(sectionSeats.map((s) => s.row))].sort();
  }

  return (
    <>
      <div className="map-toolbar">
        <div className="map-legend">
          <span><i className="lg lg-stage" />Panggung</span>
          <span><i className="lg lg-section" />Area tiket</span>
          <span><i className="lg lg-seat" />Kursi tersedia</span>
          <span><i className="lg lg-sold" />Terjual</span>
          <span><i className="lg lg-blocked" />Diblokir</span>
          <span><i className="lg lg-tenant" />Tenant / akses</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="small" disabled={!selBlocked.length} onClick={() => commit("available")}>
            Lepas blokir{selBlocked.length ? ` (${selBlocked.length})` : ""}
          </Button>
          <Button variant="primary" size="small" disabled={!selFree.length} onClick={() => commit("blocked")}>
            Blokir kursi{selFree.length ? ` (${selFree.length})` : ""}
          </Button>
        </div>
      </div>

      <div className="venue-canvas" role="group" aria-label="Denah venue">
        {elements.map((el, i) => {
          const p = el.position;
          if (!p) return null;
          const style = ELEMENT_STYLE[el.element_type ?? ""] ?? { cls: "el-other" };
          /* Elemen template menyimpan section_id master + nama yang bisa lebih panjang
             ("Block A - Seat 01-05" vs "Block A"), jadi cocokkan lewat id dulu. */
          const elSectionId = (el as { section_id?: string }).section_id;
          const section = el.booking_type
            ? sections.find((s) => elSectionId && s.sectionKey.includes(String(elSectionId).toLowerCase())) ??
              sections.find((s) => s.name.toLowerCase() === (el.name ?? "").toLowerCase()) ??
              sections.find((s) => (el.name ?? "").toLowerCase().startsWith(s.name.toLowerCase()))
            : undefined;
          const sectionSeats = section ? bySection.get(section.id) ?? [] : [];
          const showSeats = section?.bookingType === "BOOK_BY_SEAT" && sectionSeats.length > 0;

          return (
            <div
              key={el.element_id ?? `${i}`}
              className={`map-el ${style.cls}`}
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.width}%`, height: `${p.height}%` }}
            >
              <span className="map-el-name">{el.name}</span>

              {showSeats && section ? (
                <div className="map-seatgrid">
                  {(() => {
                    const rows = seatLayout(sectionSeats);
                    return rows.map((row) => (
                      <div key={`${section.id}:${row}`} className="map-seatrow">
                        {sectionSeats
                          .filter((s) => s.row === row)
                          .sort((a, b) => a.number - b.number)
                          .map((s) => {
                            const st = statusOf(s.id);
                            const isSel = selected.includes(s.id);
                            return (
                              <button
                                key={`${section.id}:${s.id}`}
                                type="button"
                                className={`map-seat ms-${st}${isSel ? " ms-sel" : ""}`}
                                aria-pressed={isSel}
                                aria-label={`Kursi ${row}${s.number} ${LABEL[st]}`}
                                title={`${row}${s.number} · ${LABEL[st]}`}
                                disabled={!selectable(st)}
                                onClick={() => toggle(s.id)}
                              >
                                {s.number}
                              </button>
                            );
                          })}
                      </div>
                    ));
                  })()}
                </div>
              ) : section ? (
                <span className="map-el-meta">
                  {BOOKING_TAG[section.bookingType] ?? section.bookingType} · kuota {section.capacity} · terjual {section.sold}
                </span>
              ) : style.tag ? (
                <span className="map-el-tag">{style.tag}</span>
              ) : null}

              {el.note ? <span className="map-el-note">{el.note}</span> : null}
            </div>
          );
        })}
      </div>

      <p className="seat-sum">
        {selected.length
          ? `${selected.length} kursi dipilih · ${selected.map((id) => id.split(":").slice(1).join("")).sort().join(", ")}`
          : "Klik kursi untuk memilih. Kursi diblokir bisa diklik untuk dilepas."}
      </p>
    </>
  );
}
