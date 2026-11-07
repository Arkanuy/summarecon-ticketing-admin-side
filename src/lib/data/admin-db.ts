import { prisma } from "@/lib/db";

/**
 * Lapisan data halaman admin. Semua angka dibaca dari database.
 * Data contoh (src/lib/data/admin.ts) sudah tidak dipakai halaman.
 */

export type AdminCategory = {
  id: string;
  name: string;
  price: number;
  quota: number;
  sold: number;
  status: string;
  sectionIds: string[];
};

export type AdminEventRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  published: boolean;
  bookingMode: "BOOK_BY_SEAT" | "BOOK_BY_QUOTA" | "STANDING";
  startAt: Date;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  venueId: string;
  venueName: string;
  venueCity: string;
  capacity: number;
  sold: number;
  quota: number;
  priceFrom: number;
  categories: AdminCategory[];
};

/** Penjualan kategori = jumlah sold_quantity pada section yang memakainya. */
function soldFor(categoryId: string, sections: { ticketCategoryId: string | null; soldQuantity: number }[]) {
  return sections.filter((s) => s.ticketCategoryId === categoryId).reduce((a, s) => a + s.soldQuantity, 0);
}

function bookingModeOf(sections: { bookingType: string }[]): AdminEventRow["bookingMode"] {
  if (sections.some((s) => s.bookingType === "BOOK_BY_SEAT")) return "BOOK_BY_SEAT";
  if (sections.some((s) => s.bookingType === "STANDING")) return "STANDING";
  return "BOOK_BY_QUOTA";
}

/** Label kategori event: ambil dari nama event karena tabel events tidak punya kolom kategori. */
function categoryLabel(code: string) {
  const parts = code.split("-");
  return parts[2] ?? "Event";
}

export async function getAdminEvents(): Promise<AdminEventRow[]> {
  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    include: { venue: true, sections: true, categories: true },
  });

  return events.map((e) => {
    const categories: AdminCategory[] = e.categories.map((c) => ({
      id: c.id,
      name: c.categoryName,
      price: c.price,
      quota: c.quota,
      sold: soldFor(c.id, e.sections),
      status: c.status,
      sectionIds: e.sections.filter((s) => s.ticketCategoryId === c.id).map((s) => s.id),
    }));

    return {
      id: e.id,
      code: e.eventCode,
      name: e.eventName,
      status: e.eventStatus,
      published: Boolean(e.publishedAt),
      bookingMode: bookingModeOf(e.sections),
      startAt: e.startAt,
      salesStartAt: e.salesStartAt,
      salesEndAt: e.salesEndAt,
      venueId: e.venueId,
      venueName: e.venue.venueName,
      venueCity: e.venue.locationLabel ?? "Bandung",
      capacity: e.sections.reduce((a, s) => a + s.capacity, 0),
      sold: categories.reduce((a, c) => a + c.sold, 0),
      quota: categories.reduce((a, c) => a + c.quota, 0),
      priceFrom: categories.length ? Math.min(...categories.map((c) => c.price)) : 0,
      categories,
    };
  });
}

export async function getAdminEvent(id: string) {
  const events = await getAdminEvents();
  return events.find((e) => e.id === id) ?? null;
}

export type AdminOrderRow = {
  id: string;
  code: string;
  eventId: string;
  eventName: string;
  buyerName: string;
  buyerEmail: string;
  orderStatus: string;
  paymentStatus: string | null;
  total: number;
  ticketCount: number;
  createdAt: Date;
  paidAt: Date | null;
};

function readBuyer(snapshot: string | null): { name: string; email: string } {
  if (!snapshot) return { name: "—", email: "—" };
  try {
    const b = JSON.parse(snapshot) as { full_name?: string; name?: string; email?: string };
    return { name: b.full_name ?? b.name ?? "—", email: b.email ?? "—" };
  } catch {
    return { name: "—", email: "—" };
  }
}

export async function getAdminOrders(): Promise<AdminOrderRow[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { event: true, payments: true, tickets: true },
  });

  return orders.map((o) => {
    const buyer = readBuyer(o.buyerSnapshot);
    return {
      id: o.id,
      code: o.orderCode,
      eventId: o.eventId,
      eventName: o.event.eventName,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      orderStatus: o.orderStatus,
      paymentStatus: o.payments[0]?.paymentStatus ?? null,
      total: o.totalAmount,
      ticketCount: o.tickets.length,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
    };
  });
}

export async function getAdminOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      event: true,
      items: { include: { category: true, seat: true } },
      payments: true,
      tickets: { include: { seat: true, section: true } },
      eTicket: true,
      refunds: true,
    },
  });
  if (!order) return null;

  const buyer = readBuyer(order.buyerSnapshot);
  return {
    id: order.id,
    code: order.orderCode,
    event: { id: order.eventId, name: order.event.eventName, startAt: order.event.startAt },
    buyer,
    orderStatus: order.orderStatus,
    paymentStatus: order.payments[0]?.paymentStatus ?? null,
    total: order.totalAmount,
    createdAt: order.createdAt,
    tickets: order.tickets.map((t) => ({
      id: t.id,
      code: t.ticketCode,
      name: t.participantName,
      seat: t.seat?.seatLabel ?? null,
      section: t.section?.sectionName ?? null,
      status: t.ticketStatus,
      attendance: t.attendanceStatus,
    })),
    eTicket: order.eTicket
      ? {
          id: order.eTicket.id,
          valid: order.eTicket.validTicketCount,
          used: order.eTicket.successfulScanCount,
          remaining: Math.max(0, order.eTicket.validTicketCount - order.eTicket.successfulScanCount),
          summary: order.eTicket.ticketStatusSummary,
        }
      : null,
    refunds: order.refunds.map((r) => ({ id: r.id, status: r.status, amount: r.refundAmount })),
  };
}

export type AdminRefundRow = {
  id: string;
  code: string;
  type: string;
  orderId: string;
  status: string;
  dataStatus: string;
  amount: number;
  participant: string;
  buyerName: string;
  requestedAt: Date;
  destinationComplete: boolean;
  method: string | null;
  provider: string | null;
  accountNo: string | null;
  accountHolder: string | null;
};

export async function getAdminRefunds(): Promise<AdminRefundRow[]> {
  const refunds = await prisma.refund.findMany({
    orderBy: { requestedAt: "desc" },
    include: { lines: { include: { ticket: true } }, order: true },
  });

  return refunds.map((r) => ({
    id: r.id,
    code: r.refundCode,
    type: r.refundType,
    orderId: r.orderId,
    status: r.status,
    dataStatus: r.refundDataStatus,
    amount: r.refundAmount,
    participant: r.lines[0]?.ticket.participantName ?? "—",
    buyerName: readBuyer(r.order.buyerSnapshot).name,
    requestedAt: r.requestedAt,
    destinationComplete: Boolean(r.destMethod && r.destAccountNumber && r.destAccountHolder),
    method: r.destMethod,
    provider: r.destProviderName,
    accountNo: r.destAccountNumber,
    accountHolder: r.destAccountHolder,
  }));
}

export async function getAdminRefund(id: string) {
  const refund = await prisma.refund.findUnique({
    where: { id },
    include: {
      event: true,
      order: true,
      lines: { include: { ticket: true } },
      histories: { orderBy: { changedAt: "asc" } },
    },
  });
  if (!refund) return null;

  return {
    id: refund.id,
    code: refund.refundCode,
    type: refund.refundType,
    status: refund.status,
    dataStatus: refund.refundDataStatus,
    amount: refund.refundAmount,
    eventName: refund.event.eventName,
    orderId: refund.orderId,
    requestedAt: refund.requestedAt,
    updatedAt: refund.histories.at(-1)?.changedAt ?? refund.requestedAt,
    tickets: refund.lines.map((l) => ({ id: l.ticketId, name: l.ticket.participantName, amount: l.amount })),
    destination: refund.destMethod
      ? {
          method: refund.destMethod,
          provider: refund.destProviderName,
          accountNo: refund.destAccountNumber,
          holder: refund.destAccountHolder,
        }
      : null,
    histories: refund.histories.map((h) => ({ from: h.fromStatus, to: h.toStatus, at: h.changedAt, reason: h.reason })),
  };
}

export async function getAdminVenues() {
  const venues = await prisma.venue.findMany({
    include: { layoutTemplates: true, _count: { select: { events: true } } },
    orderBy: { venueName: "asc" },
  });
  return venues.map((v) => ({
    id: v.id,
    code: v.venueCode,
    name: v.venueName,
    city: v.locationLabel ?? "—",
    type: v.venueType ?? "—",
    capacity: v.capacityOfficial,
    status: v.status,
    eventCount: v._count.events,
    templateCount: v.layoutTemplates.length,
  }));
}

export async function getAdminUsers() {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: "asc" } });
  return users.map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    phone: u.phoneNumber ?? "—",
    role: u.role.roleName,
    active: u.accountStatus === "ACTIVE",
    createdAt: u.createdAt,
  }));
}

export async function getAdminDashboard() {
  const events = await getAdminEvents();
  const orders = await getAdminOrders();
  const refunds = await getAdminRefunds();

  const paid = orders.filter((o) => o.orderStatus === "PAID" || o.orderStatus.includes("REFUND"));
  const openRefund = refunds.filter((r) =>
    ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "NEED_CONFIRMATION"].includes(r.status),
  );
  const checkins = await prisma.checkinRecord.count({ where: { scanResult: "SUCCESS" } });

  return {
    events,
    recentOrders: orders.slice(0, 5),
    openRefunds: openRefund,
    stats: {
      sold: events.reduce((a, e) => a + e.sold, 0),
      quota: events.reduce((a, e) => a + e.quota, 0),
      revenue: paid.reduce((a, o) => a + o.total, 0),
      checkedIn: checkins,
      refundOpen: openRefund.length,
      published: events.filter((e) => e.published).length,
    },
  };
}
