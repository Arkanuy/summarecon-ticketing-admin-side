import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, VersionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminEvent } from "@/lib/data/admin-db";
import { TicketPanel } from "@/components/event/TicketPanel";
import { PriceTiers } from "@/components/event/PriceTiers";
import { VenueMap } from "@/components/seat-map/VenueMap";
import { EventStatusActions } from "@/components/event/EventStatusActions";
import { prisma } from "@/lib/db";
import { EVENT_STATUS_LABEL, rupiah } from "@/lib/utils";

export const instant = false;

/** Status di DB bisa lebih kaya (mis. DISABLED_EVENT_CANCELLED); petakan ke 4 status yang dikenal denah. */
function toSeatStatus(raw: string): "available" | "hold" | "sold" | "blocked" {
  const s = raw.toUpperCase();
  if (s === "AVAILABLE") return "available";
  if (s === "SOLD" || s === "USED") return "sold";
  if (s === "BLOCKED" || s.startsWith("DISABLED")) return "blocked";
  if (s.startsWith("HOLD") || s === "RESERVED") return "hold";
  return "blocked";
}

const MODE_LABEL: Record<string, string> = {
  BOOK_BY_SEAT: "Book by Seat",
  BOOK_BY_QUOTA: "Book by Quota",
  STANDING: "Standing",
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const event = await getAdminEvent(id);
  if (!event) notFound();

  const sections = await prisma.eventSection.findMany({
    where: { eventId: id },
    orderBy: { sectionName: "asc" },
  });
  const seatStats = await prisma.eventSeat.groupBy({ by: ["status"], where: { eventId: id }, _count: true });
  /* Posisi elemen denah: dari layout template yang dipakai event ini. */
  const template = await prisma.layoutTemplate.findUnique({
    where: { id: (await prisma.event.findUnique({ where: { id }, select: { layoutTemplateId: true } }))?.layoutTemplateId ?? "" },
    select: { layoutElements: true },
  });
  const layoutElements = (() => {
    try {
      return JSON.parse(template?.layoutElements ?? "[]") as {
        element_id?: string;
        name?: string;
        element_type?: string;
        ticketable?: boolean;
        note?: string;
        booking_type?: string;
        position?: { x: number; y: number; width: number; height: number };
      }[];
    } catch {
      return [];
    }
  })();

  const seats = await prisma.eventSeat.findMany({
    where: { eventId: id },
    orderBy: [{ sectionId: "asc" }, { rowLabel: "asc" }, { seatNumber: "asc" }],
  });
  const [tickets, attendance, priceTiers] = await Promise.all([
    prisma.ticket.findMany({
      where: { eventId: id },
      orderBy: [{ attendeeSequence: "asc" }],
      take: 100,
      include: { seat: true, section: true, orderItem: { include: { category: true } } },
    }),
    prisma.ticket.groupBy({ by: ["attendanceStatus", "ticketStatus"], where: { eventId: id }, _count: true }),
    prisma.ticketPriceTier.findMany({
      where: { category: { eventId: id } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const sudah = attendance.filter((a) => a.attendanceStatus === "CHECKED_IN").reduce((s, a) => s + a._count, 0);
  const belum = attendance.filter((a) => a.ticketStatus === "ISSUED").reduce((s, a) => s + a._count, 0);
  const qrAgg = await prisma.eTicket.aggregate({
    where: { eventId: id },
    _sum: { validTicketCount: true, successfulScanCount: true },
    _count: true,
  });
  const summary = {
    sudah_check_in: sudah,
    belum_check_in: belum,
    qr_issued: qrAgg._count,
    scans_used: qrAgg._sum.successfulScanCount ?? 0,
    scan_quota: qrAgg._sum.validTicketCount ?? 0,
  };

  return (
    <>
      <Link href="/events" className="back-link">← Semua event</Link>

      <div className="page-head">
        <div>
          <span className="eyebrow"><i className="eyebrow-line" />{event.code}</span>
          <h1 className="page-title" style={{ marginTop: 6 }}>{event.name}</h1>
          <p className="page-lead">
            {event.venueName} · {event.startAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })} · {MODE_LABEL[event.bookingMode]}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <VersionBadge status={event.status} label={EVENT_STATUS_LABEL[event.status as keyof typeof EVENT_STATUS_LABEL] ?? event.status} />
          <Badge tone={event.published ? "ok" : "muted"}>{event.published ? "Publik" : "Belum publik"}</Badge>
          <EventStatusActions eventId={event.id} eventName={event.name} status={event.status} />
        </div>
      </div>

      <div className="stats">
        <div className="stat stat-accent">
          <b>{event.sold}</b><span>Terjual</span>
          <div className="bar"><i style={{ width: `${event.quota ? Math.round((event.sold / event.quota) * 100) : 0}%` }} /></div>
        </div>
        <div className="stat"><b>{event.quota}</b><span>Kuota</span></div>
        <div className="stat"><b>{event.capacity}</b><span>Kapasitas arena</span></div>
        <div className="stat"><b>{rupiah(event.priceFrom)}</b><span>Harga mulai</span></div>
      </div>

      <div className="section-head"><h2 className="section-title">Denah venue</h2></div>
      <VenueMap
        eventId={id}
        elements={layoutElements}
        sections={sections.map((s) => ({
          id: s.id,
          name: s.sectionName,
          bookingType: s.bookingType,
          capacity: s.capacity,
          sold: s.soldQuantity,
          sectionId: s.sectionId,
          sectionKey: `${s.sectionId} ${s.sectionName}`.toLowerCase(),
        }))}
        seats={seats.map((x) => ({
          id: x.id,
          sectionId: x.sectionId,
          row: x.rowLabel ?? "?",
          number: Number(x.seatNumber) || 0,
          status: toSeatStatus(x.status),
        }))}
      />

      <div className="section-head"><h2 className="section-title">Section &amp; metode booking</h2></div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Section</th><th>Metode</th><th className="num">Kapasitas</th>
              <th className="num">Terjual</th><th className="num">Sisa</th><th>Inventory</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const pct = s.capacity ? Math.round((s.soldQuantity / s.capacity) * 100) : 0;
              return (
                <tr key={s.id}>
                  <td className="t-name">{s.sectionName}</td>
                  <td>{MODE_LABEL[s.bookingType] ?? s.bookingType}</td>
                  <td className="num mono">{s.capacity}</td>
                  <td className="num mono">{s.soldQuantity}</td>
                  <td className="num mono">{s.capacity - s.soldQuantity}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`bar${pct >= 100 ? " bar-full" : pct >= 80 ? " bar-warn" : ""}`} style={{ width: 80 }}>
                        <i style={{ width: `${Math.min(pct, 100)}%` }} />
                      </span>
                      <span className="mono sub" style={{ fontSize: 11 }}>{s.soldQuantity}/{s.capacity}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="section-head"><h2 className="section-title">Kategori tiket</h2></div>
      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Kategori</th><th className="num">Harga</th><th className="num">Kuota</th><th className="num">Terjual</th><th className="num">Sisa</th><th>Status</th></tr>
          </thead>
          <tbody>
            {event.categories.map((c) => (
              <tr key={c.id}>
                <td className="t-name">{c.name}</td>
                <td className="num mono">{rupiah(c.price)}</td>
                <td className="num mono">{c.quota}</td>
                <td className="num mono">{c.sold}</td>
                <td className="num mono">{c.quota - c.sold}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="section-head"><h2 className="section-title">Area / section</h2></div>
      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Section</th><th>Metode</th><th className="num">Kapasitas</th><th className="num">Terjual</th><th className="num">Sisa</th><th>Inventory</th></tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s.id}>
                <td className="t-name">{s.sectionName}</td>
                <td>{MODE_LABEL[s.bookingType] ?? s.bookingType}</td>
                <td className="num mono">{s.capacity}</td>
                <td className="num mono">{s.soldQuantity}</td>
                <td className="num mono">{s.availableQuantity}</td>
                <td>{s.inventoryStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="section-head"><h2 className="section-title">Harga bertingkat</h2></div>
      <Card>
        {event.categories.map((c) => (
          <div key={c.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--line)" }}>
            <PriceTiers
              categoryId={c.id}
              categoryName={c.name}
              basePrice={c.price}
              initialTiers={priceTiers
                .filter((t) => t.ticketCategoryId === c.id)
                .map((t) => ({
                  id: t.id,
                  label: t.label,
                  price: t.price,
                  starts_at: t.startsAt.toISOString(),
                  ends_at: t.endsAt.toISOString(),
                  is_promo: t.isPromo,
                  is_active: t.startsAt <= new Date() && new Date() <= t.endsAt,
                }))}
            />
          </div>
        ))}
      </Card>

      <div className="section-head"><h2 className="section-title">Tiket & peserta</h2></div>
      <TicketPanel
        eventId={id}
        summary={summary}
        initial={{
          total: tickets.length,
          items: tickets.map((t) => ({
            ticket_id: t.id,
            ticket_code: t.ticketCode,
            participant_name: t.participantName,
            order_id: t.orderId,
            seat: t.seat?.seatLabel ?? null,
            section: t.section?.sectionName ?? null,
            category: t.orderItem?.category?.categoryName ?? null,
            ticket_status: t.ticketStatus,
            attendance_status: t.attendanceStatus,
          })),
        }}
      />
    </>
  );
}
