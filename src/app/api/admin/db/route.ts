import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isAdminUser } from "@/lib/auth/session";

/**
 * GET /api/admin/db?table=venues&take=25&q=cari
 *
 * Penampil database untuk admin: membaca tabel SQLite apa adanya.
 * Dipakai halaman /api-docs supaya data bisa dilihat tanpa Prisma Studio.
 * Hanya admin yang login. Kolom sensitif disamarkan.
 */

const TABLES = {
  venues: { model: () => prisma.venue, label: "venues" },
  events: { model: () => prisma.event, label: "events" },
  event_sections: { model: () => prisma.eventSection, label: "event_sections" },
  event_seats: { model: () => prisma.eventSeat, label: "event_seats" },
  ticket_categories: { model: () => prisma.ticketCategory, label: "ticket_categories" },
  ticket_price_tiers: { model: () => prisma.ticketPriceTier, label: "ticket_price_tiers" },
  orders: { model: () => prisma.order, label: "orders" },
  order_items: { model: () => prisma.orderItem, label: "order_items" },
  tickets: { model: () => prisma.ticket, label: "tickets" },
  e_tickets: { model: () => prisma.eTicket, label: "e_tickets" },
  checkin_records: { model: () => prisma.checkinRecord, label: "checkin_records" },
  payments: { model: () => prisma.payment, label: "payments" },
  refunds: { model: () => prisma.refund, label: "refunds" },
  users: { model: () => prisma.user, label: "users" },
  layout_templates: { model: () => prisma.layoutTemplate, label: "layout_templates" },
  seat_blocks: { model: () => prisma.seatBlock, label: "seat_blocks" },
  system_settings: { model: () => prisma.systemSetting, label: "system_settings" },
} as const;

type TableName = keyof typeof TABLES;

/** Kolom yang tidak boleh tampil mentah. */
const MASK = /password|hash|accountno|account_number|phone|token/i;

const mask = (value: unknown) => {
  if (typeof value !== "string" || value.length < 6) return "•••";
  return value.slice(0, 3) + "•••" + value.slice(-2);
};

export async function GET(request: Request) {
  const user = await getSession(request, "ADMIN");
  if (!isAdminUser(user)) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Masuk sebagai admin untuk melihat data" } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const table = (url.searchParams.get("table") ?? "venues") as TableName;
  if (!(table in TABLES)) {
    return NextResponse.json(
      { error: { code: "TABLE_TIDAK_DIKENAL", message: "Tabel tidak dikenali", details: { tables: Object.keys(TABLES) } } },
      { status: 400 },
    );
  }

  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") ?? 25) || 25));
  const q = url.searchParams.get("q")?.trim();

  /* Pencarian teks generik: cari di semua kolom bertipe string pada tabel itu. */
  let where: Record<string, unknown> = {};
  if (q) {
    const probe = TABLES[table].model() as unknown as {
      findFirst: (args?: unknown) => Promise<Record<string, unknown> | null>;
    };
    const sample = await probe.findFirst({});
    const stringFields = sample
      ? Object.entries(sample)
          .filter(([, v]) => typeof v === "string")
          .map(([k]) => k)
      : [];
    if (stringFields.length) {
      where = { OR: stringFields.map((f) => ({ [f]: { contains: q } })) };
    }
  }

  const client = TABLES[table].model() as unknown as {
    findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
    count: (args: unknown) => Promise<number>;
  };

  const [rows, total] = await Promise.all([
    client.findMany({ where, take, orderBy: undefined }),
    client.count({ where }),
  ]);

  const columns = rows.length ? Object.keys(rows[0]) : [];
  const safe = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, MASK.test(k) && v ? mask(v) : v instanceof Date ? v.toISOString() : v]),
    ),
  );

  return NextResponse.json({
    data: {
      table,
      total,
      shown: safe.length,
      columns,
      rows: safe,
      tables: Object.keys(TABLES),
    },
  });
}
