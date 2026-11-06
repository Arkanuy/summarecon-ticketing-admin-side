import Link from "next/link";
import { VersionBadge } from "@/components/ui/Badge";
import { PublishToggle } from "@/components/event/PublishToggle";
import { EVENT_STATUS_LABEL, rupiah, ticketSummary } from "@/lib/utils";
import type { AdminEvent } from "@/types/admin";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGS", "SEP", "OKT", "NOV", "DES"];

/** Ringkasan event satu baris: cukup untuk memindai status, bukan kartu pemasaran. */
export function EventRow({ event }: { event: AdminEvent }) {
  const s = ticketSummary(event.categories);
  const pct = s.quota ? Math.round((s.sold / s.quota) * 100) : 0;
  const [, month, day] = event.date.split("-");
  const from = Math.min(...event.categories.map((c) => c.price));

  return (
    <div className="event-row">
      <div className="date-chip">
        <b>{Number(day)}</b>
        <span>{MONTHS[Number(month) - 1]}</span>
      </div>

      <div style={{ minWidth: 0 }}>
        <Link href={`/events/${event.id}`} className="event-row-title">{event.name}</Link>
        <p className="event-row-meta">
          {event.category} · {event.time} · mulai {rupiah(from)}
        </p>
      </div>

      <div>
        <div className="mono" style={{ fontSize: 11.5 }}>
          {s.sold}/{s.quota}
        </div>
        <div className="bar" style={{ marginTop: 5 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <VersionBadge status={event.status} label={EVENT_STATUS_LABEL[event.status]} />
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
