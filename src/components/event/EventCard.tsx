import Link from "next/link";
import { PetalFan } from "@/components/shared/PetalMark";
import { VersionBadge } from "@/components/ui/Badge";
import { PublishToggle } from "@/components/event/PublishToggle";
import { EVENT_STATUS_LABEL, rupiah, ticketSummary, type EventTone } from "@/lib/utils";
import type { AdminEvent } from "@/types/admin";

const TONE_CLASS: Record<EventTone, string> = {
  musik: "art-musik",
  seminar: "art-seminar",
  lifestyle: "art-lifestyle",
  pameran: "art-pameran",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGS", "SEP", "OKT", "NOV", "DES"];

/** Kartu event bergaya .event-card customer: artistrip gradient + date tile. */
export function EventCard({ event, tone }: { event: AdminEvent; tone: EventTone }) {
  const summary = ticketSummary(event.categories);
  const pct = summary.quota ? Math.round((summary.sold / summary.quota) * 100) : 0;
  const [, month, day] = event.date.split("-");
  const from = Math.min(...event.categories.map((c) => c.price));

  return (
    <article className="event-card">
      <div className={`event-art ${TONE_CLASS[tone]}`}>
        <span className="date-tile">
          <strong>{Number(day)}</strong>
          <span>{MONTHS[Number(month) - 1]}</span>
        </span>
        <span className="event-art-word">{event.name.split(" ")[0].toUpperCase()}</span>
        <PetalFan className="art-petals" stroke="#fff" width={3} />
        <span className="event-flag">{summary.sold}/{summary.quota} terjual</span>
      </div>
      <div className="event-card-body">
        <div className="event-category">
          {event.category.toUpperCase()} <i /> {event.time}
        </div>
        <Link href={`/events/${event.id}`} className="event-card-title">
          {event.name}
        </Link>
        <p className="event-meta">
          {pct}% terisi · mulai {rupiah(from)}
        </p>
        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="event-card-bottom">
          <VersionBadge status={event.status} label={EVENT_STATUS_LABEL[event.status]} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PublishToggle published={event.published} label={event.name} />
            <Link href={`/events/${event.id}`} className="round-link" aria-label={`Kelola ${event.name}`}>
              →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
