import Link from "next/link";
import { VersionBadge } from "@/components/ui/Badge";
import { PublishToggle } from "@/components/event/PublishToggle";
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
        <PublishToggle published={event.published} label={event.name} />
        <Link href={`/events/${event.id}`} className="button button-secondary button-small">
          Kelola
        </Link>
      </div>
    </div>
  );
}
