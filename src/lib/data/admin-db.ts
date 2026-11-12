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
  endAt: Date;
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
  /** Jumlah tiket terbit per event_section (sumber kebenaran "terjual"). */
  soldBySection?: Map<string, number>;
};

/** Penjualan kategori = jumlah tiket terbit pada section milik kategori itu. */
function bookingModeOf(sections: { bookingType: string }[]): AdminEventRow["bookingMode"] {
  if (sections.some((s) => s.bookingType === "BOOK_BY_SEAT")) return "BOOK_BY_SEAT";
  if (sections.some((s) => s.bookingType === "STANDING")) return "STANDING";
  return "BOOK_BY_QUOTA";
}

export async function getAdminEvents(): Promise<AdminEventRow[]> {
  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    include: { venue: true, sections: true, categories: true },
  });

  /*
   * Sumber kebenaran "terjual" adalah TIKET, bukan section.sold_quantity.
   * Penjualan Book by Seat mengubah event_seats.status -> SOLD dan membuat tiket,
   * tetapi tidak pernah menaikkan counter section, sehingga dashboard selalu
   * menampilkan angka jauh lebih kecil dari yang benar.
   */
  const issued = await prisma.ticket.groupBy({
    by: ["eventId", "eventSectionId"],
    where: { ticketStatus: { in: ["ISSUED", "USED"] } },
    _count: true,
  });
  const soldBySection = new Map<string, number>();
  const soldByEvent = new Map<string, number>();
  for (const g of issued) {
    const sid = g.eventSectionId ?? "";
    soldBySection.set(sid, (soldBySection.get(sid) ?? 0) + g._count);
    soldByEvent.set(g.eventId, (soldByEvent.get(g.eventId) ?? 0) + g._count);
  }

  return events.map((e) => {
    const categories: AdminCategory[] = e.categories.map((c) => ({
      id: c.id,
      name: c.categoryName,
      price: c.price,
      quota: c.quota,
      /* Tiket terbit pada section milik kategori ini. */
      sold: e.sections
        .filter((s) => s.ticketCategoryId === c.id)
        .reduce((a, s) => a + (soldBySection.get(s.id) ?? 0), 0),
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
      endAt: e.endAt,
      salesStartAt: e.salesStartAt,
      salesEndAt: e.salesEndAt,
      venueId: e.venueId,
      venueName: e.venue.venueName,
      venueCity: e.venue.locationLabel ?? "Bandung",
      capacity: e.sections.reduce((a, s) => a + s.capacity, 0),
      sold: soldByEvent.get(e.id) ?? 0,
      quota: categories.reduce((a, c) => a + c.quota, 0),
      soldBySection,
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

export async function getAdminOrders(search?: string): Promise<AdminOrderRow[]> {
  /*
   * Pencarian dilakukan di database, bukan setelah semua baris dimuat.
   * Dengan 400+ peserta, memuat seluruh tabel lalu memfilter di memori membuat
   * halaman Booking makin lambat setiap kali ada order baru.
   */
  const q = search?.trim();
  const where = q
    ? {
        OR: [
          { orderCode: { contains: q } },
          { id: { contains: q } },
          { buyerSnapshot: { contains: q } },
          { tickets: { some: { ticketCode: { contains: q } } } },
          { tickets: { some: { participantName: { contains: q } } } },
          { tickets: { some: { seat: { seatLabel: { contains: q } } } } },
        ],
      }
    : {};

  const orders = await prisma.order.findMany({
    where,
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
          /* Token QR yang dicetak petugas — dulu kartu hanya menggambar pola hiasan. */
          token: order.eTicket.qrTokenHash,
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
    include: {
      layoutTemplates: { include: { events: { select: { id: true, eventName: true } } } },
      _count: { select: { events: true } },
    },
    orderBy: { venueName: "asc" },
  });

  /* Kapasitas resmi null di data contoh; hitung dari section event supaya tidak kosong. */
  const capacities = await prisma.eventSection.groupBy({
    by: ["eventId"],
    _sum: { capacity: true },
  });
  const events = await prisma.event.findMany({ select: { id: true, venueId: true } });
  const capByEvent = new Map(capacities.map((c) => [c.eventId, c._sum.capacity ?? 0]));
  const capByVenue = new Map<string, number>();
  for (const e of events) {
    capByVenue.set(e.venueId, (capByVenue.get(e.venueId) ?? 0) + (capByEvent.get(e.id) ?? 0));
  }

  return venues.map((v) => ({
    id: v.id,
    code: v.venueCode,
    name: v.venueName,
    alias: v.venueAlias ?? null,
    location: v.locationLabel ?? "—",
    type: v.venueType ?? "—",
    floor: v.floor ?? null,
    capacityOfficial: v.capacityOfficial,
    capacityComputed: capByVenue.get(v.id) ?? 0,
    capacityStatus: v.capacityValidationStatus ?? null,
    status: v.status,
    notes: v.notes ?? null,
    eventCount: v._count.events,
    templates: v.layoutTemplates.map((t) => ({
      id: t.id,
      name: t.templateName,
      version: t.version,
      status: t.templateStatus,
      bookingTypes: (() => {
        try {
          return JSON.parse(t.activeBookingTypes ?? "[]") as string[];
        } catch {
          return [];
        }
      })(),
      eventCount: t.events.length,
    })),
  }));
}

/** Detail satu venue: layout template, elemen, dan event yang memakainya. */
export async function getAdminVenue(id: string) {
  const venues = await getAdminVenues();
  const base = venues.find((v) => v.id === id);
  if (!base) return null;

  const layout = await prisma.layoutTemplate.findMany({ where: { venueId: id } });
  const events = await prisma.event.findMany({
    where: { venueId: id },
    include: { sections: true, categories: true },
    orderBy: { startAt: "desc" },
  });

  const elements = layout.flatMap((t) => {
    try {
      return JSON.parse(t.layoutElements ?? "[]") as { name?: string; element_type?: string; ticketable?: boolean }[];
    } catch {
      return [];
    }
  });

  return {
    ...base,
    layouts: layout.map((t) => ({
      id: t.id,
      name: t.templateName,
      version: t.version,
      status: t.templateStatus,
      sourcePage: t.sourceBlueprintPage,
      bookingTypes: (() => {
        try {
          return JSON.parse(t.activeBookingTypes ?? "[]") as string[];
        } catch {
          return [];
        }
      })(),
      elements: (() => {
        try {
          return JSON.parse(t.layoutElements ?? "[]") as { name?: string; element_type?: string; ticketable?: boolean }[];
        } catch {
          return [];
        }
      })(),
    })),
    elements,
    events: events.map((e) => ({
      id: e.id,
      name: e.eventName,
      status: e.eventStatus,
      startAt: e.startAt,
      capacity: e.sections.reduce((s, x) => s + x.capacity, 0),
      sold: e.sections.reduce((s, x) => s + x.soldQuantity, 0),
      categories: e.categories.length,
    })),
  };
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


/**
 * Laporan penjualan dengan filter periode (tanggal bayar).
 * Tanpa filter: semua order dihitung.
 */
export async function getSalesReport(from?: string, to?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59`) : null;

  const paidAtFilter =
    start || end
      ? { paidAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } }
      : {};

  const orders = await prisma.order.findMany({
    where: { orderStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, ...paidAtFilter },
    include: { tickets: true, items: { include: { category: true } }, event: true },
  });

  type Agg = { event: string; category: string; price: number; sold: number; quota: number; revenue: number };
  const map = new Map<string, Agg>();

  for (const o of orders) {
    for (const t of o.tickets) {
      if (t.ticketStatus === "CANCELLED") continue;
      const item = o.items.find((i) => i.id === t.orderItemId);
      const cat = item?.category;
      if (!cat) continue;
      const key = `${o.event.eventName}|${cat.categoryName}`;
      const row = map.get(key) ?? {
        event: o.event.eventName,
        category: cat.categoryName,
        price: item.unitPrice,
        sold: 0,
        quota: cat.quota,
        revenue: 0,
      };
      row.sold += 1;
      row.revenue += item.unitPrice;
      map.set(key, row);
    }
  }

  const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue);
  const label = start || end ? `${from || "awal"} – ${to || "akhir"}` : "semua waktu";

  return {
    rows,
    total: rows.reduce((s, r) => s + r.revenue, 0),
    orders: {
      paid: orders.length,
      tickets: orders.reduce((s, o) => s + o.tickets.filter((t) => t.ticketStatus !== "CANCELLED").length, 0),
    },
    period: { from: from ?? null, to: to ?? null, label },
  };
}
