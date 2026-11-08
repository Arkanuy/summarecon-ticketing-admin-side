import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/**
 * POST /api/customer/refunds — peserta mengajukan refund.
 *
 * Sebelumnya tidak ada endpoint untuk peserta, sehingga pengajuan dari customer side
 * tidak pernah sampai ke admin. Refund tetap diproses manual (§6.4); endpoint ini
 * hanya mencatat pengajuan beserta data tujuan pengembalian.
 *
 * Body:
 * {
 *   order_id: string,
 *   ticket_ids?: string[],            // kosong = semua tiket dalam order
 *   dest_method?: "BANK" | "EWALLET",
 *   dest_provider_name?: string,
 *   dest_account_number?: string,
 *   dest_account_holder?: string,
 *   reason?: string
 * }
 *
 * Kalau data tujuan belum lengkap, status menjadi NEED_CONFIRMATION supaya admin
 * melihatnya di antrean "menunggu data refund".
 */
export async function POST(request: Request) {
  const session = await getSession(request, "CUSTOMER");
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Masuk sebagai peserta untuk mengajukan refund" } },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const orderId = String(body?.order_id ?? "").trim();
  if (!orderId) {
    return NextResponse.json(
      { error: { code: "ORDER_KOSONG", message: "order_id wajib diisi" } },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tickets: true, event: true },
  });
  if (!order) {
    return NextResponse.json({ error: { code: "ORDER_TIDAK_DITEMUKAN", message: "Order tidak ada" } }, { status: 404 });
  }
  if (order.userId !== session.userId) {
    return NextResponse.json({ error: { code: "BUKAN_ORDER_ANDA", message: "Order ini milik akun lain" } }, { status: 403 });
  }
  if (order.orderStatus !== "PAID" && order.orderStatus !== "PARTIALLY_REFUNDED") {
    return NextResponse.json(
      { error: { code: "ORDER_TIDAK_BISA_REFUND", message: `Order berstatus ${order.orderStatus}` } },
      { status: 409 },
    );
  }

  /* Refund sampai H-1 (§6.4). Event hari ini = sudah lewat batas. */
  const eventStart = new Date(order.event.startAt);
  const cutoff = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
  if (new Date() > cutoff) {
    return NextResponse.json(
      {
        error: {
          code: "LEWAT_BATAS_REFUND",
          message: "Refund hanya bisa diajukan sampai H-1 sebelum acara",
        },
      },
      { status: 409 },
    );
  }

  /* Sudah pernah mengajukan? kembalikan yang ada, jangan gandakan. */
  const existing = await prisma.refund.findFirst({
    where: { orderId: order.id, status: { notIn: ["REJECTED", "COMPLETED"] } },
  });
  if (existing) {
    return NextResponse.json({
      data: { refund_id: existing.id, refund_code: existing.refundCode, status: existing.status, duplicate: true },
    });
  }

  const requestedTicketIds: string[] = Array.isArray(body?.ticket_ids) ? body.ticket_ids.map(String) : [];
  const tickets = requestedTicketIds.length
    ? order.tickets.filter((t) => requestedTicketIds.includes(t.id))
    : order.tickets;

  if (tickets.length === 0) {
    return NextResponse.json(
      { error: { code: "TIKET_KOSONG", message: "Tidak ada tiket yang bisa direfund" } },
      { status: 400 },
    );
  }

  const destMethod = String(body?.dest_method ?? "").toUpperCase() || null;
  const destProvider = body?.dest_provider_name ? String(body.dest_provider_name) : null;
  const destAccount = body?.dest_account_number ? String(body.dest_account_number) : null;
  const destHolder = body?.dest_account_holder ? String(body.dest_account_holder) : null;

  const missing: string[] = [];
  if (!destMethod) missing.push("dest_method");
  if (!destProvider) missing.push("dest_provider_name");
  if (!destAccount) missing.push("dest_account_number");
  if (!destHolder) missing.push("dest_account_holder");

  /* Nominal refund = harga tiket yang diajukan (tanpa biaya admin, §6.4). */
  const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const unitPrice = orderItems.length ? Math.round(order.totalAmount / Math.max(order.quantity, 1)) : 0;
  const refundAmount = unitPrice * tickets.length;

  const seq = (await prisma.refund.count()) + 1;
  const refundId = `RFD-${order.orderCode}-${seq}`;
  const now = new Date();

  const refund = await prisma.refund.create({
    data: {
      id: refundId,
      refundCode: `RFD-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`,
      refundType: tickets.length === order.quantity ? "FULL" : "PARTIAL",
      eventId: order.eventId,
      orderId: order.id,
      requestedByUserId: session.userId,
      quantity: tickets.length,
      refundAmount,
      currency: "IDR",
      status: missing.length ? "NEED_CONFIRMATION" : "REQUESTED",
      refundDataStatus: missing.length ? "INCOMPLETE" : "COMPLETE",
      missingDestinationFields: missing.length ? JSON.stringify(missing) : null,
      approvalRequired: true,
      approvalMode: "ADMIN",
      requestedAt: now,
      targetCompletionDays: 7,
      completionNotificationMode: "MANUAL",
      destMethod,
      destProviderName: destProvider,
      destAccountNumber: destAccount,
      destAccountHolder: destHolder,
      destIsDummy: true,
      manualAdminNote: body?.reason ? String(body.reason).slice(0, 500) : null,
    },
  });

  return NextResponse.json(
    {
      data: {
        refund_id: refund.id,
        refund_code: refund.refundCode,
        status: refund.status,
        quantity: refund.quantity,
        refund_amount: refund.refundAmount,
        missing_fields: missing,
      },
    },
    { status: 201 },
  );
}
