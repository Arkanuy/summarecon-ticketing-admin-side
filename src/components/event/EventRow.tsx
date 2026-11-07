import Link from "next/link";
import { VersionBadge } from "@/components/ui/Badge";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { EVENT_STATUS_LABEL, rupiah } from "@/lib/utils";
import type { AdminEventRow } from "@/lib/data/admin-db";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGS", "SEP", "OKT", "NOV", "DES"];

/** Ringkasan event satu baris, datanya dari database. */
export function EventRow({ event }: { event: AdminEventRow }) {
  const pct = event.quota ? Math.round((event.sold / event.quota) * 100) : 0;
  const start = event.startAt;

  return (
    <div className="event-row">
      <div className="date-chip">
        <b>{start.getDate()}</b>
        <span>{MONTHS[start.getMonth()]}</span>
      </div>

      <div style={{ minWidth: 0 }}>
        <Link href={`/events/${event.id}`} className="event-row-title">{event.name}</Link>
        <p className="event-row-meta">
          {event.venueName} · mulai {rupiah(event.priceFrom)}
        </p>
      </div>

      <div>
        <div className="mono" style={{ fontSize: 11.5 }}>
          {event.sold}/{event.quota}
        </div>
        <div className="bar" style={{ marginTop: 5 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <VersionBadge
          status={event.status}
          label={EVENT_STATUS_LABEL[event.status as keyof typeof EVENT_STATUS_LABEL] ?? event.status}
        />
      </div>

      <div className="event-row-side">
        <ToggleSwitch
          on={event.published}
          label={`Publikasikan ${event.name}`}
          endpoint={`/api/events/${event.id}`}
          bodyKey="published"
          onText={`"${event.name}" dipublikasikan.`}
          offText={`"${event.name}" ditarik ke draf.`}
          confirmOn={{
            title: `Publikasikan "${event.name}"?`,
            description: "Event akan tampil ke peserta dan memakai status sesuai periode penjualannya.",
          }}
          confirmOff={{
            title: `Tarik "${event.name}" dari publikasi?`,
            description: "Event kembali ke draf dan disembunyikan dari peserta. Pesanan yang sudah ada tidak berubah.",
          }}
        />
        <Link href={`/events/${event.id}`} className="button button-secondary button-small">
          Kelola
        </Link>
      </div>
    </div>
  );
}
