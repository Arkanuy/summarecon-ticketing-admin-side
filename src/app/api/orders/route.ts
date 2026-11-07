import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, roleAudience } from "@/lib/auth/session";
import { issueQrToken } from "@/lib/qr/token";

/**
 * POST /api/orders — buat pesanan dari sisi customer.
 *
 * Body:
 * {
 *   event_id: string,
 *   seat_ids?: string[],            // untuk section Book by Seat
 *   items?: [{ section_id, category_id?, quantity }],  // untuk kuota / standing
 *   attendee_name?: string,
 *   attendees?: string[],           // nama per tiket (opsional)
 *   simulate_payment?: boolean      // prototipe: langsung PAID + SOLD
 * }
 *
 * Satu panggilan menyelesaikan seluruh rantai:
 *   1. validasi event + periode penjualan
 *   2. klaim kursi secara atomik (AVAILABLE -> SOLD), cegah pemesanan ganda
 *   3. buat orders + order_items + tickets
 *   4. kurangi kuota section untuk Book by Quota / Standing
 *   5. terbitkan e_ticket dengan QR
 *
 * Kalau salah satu langkah gagal, transaksi dibatalkan seluruhnya.
 */

class OrderError extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: unknown) {
    super(message);
  }
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || roleAudience(session.roleId) !== "CUSTOMER") {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Masuk sebagai peserta untuk memesan" } },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "BODY_TIDAK_VALID", message: "Body JSON tidak valid" } },
      { status: 400 },
    );
  }

  const eventId = String(body.event_id ?? "").trim();
  if (!eventId) {
    return NextResponse.json({ error: { code: "EVENT_KOSONG", message: "event_id wajib diisi" } }, { status: 400 });
  }

  const seatIds: string[] = Array.isArray(body.seat_ids) ? body.seat_ids.map(String) : [];
  const items: { section_id: string; category_id?: string; quantity: number }[] = Array.isArray(body.items)
    ? (body.items as Record<string, unknown>[])
        .map((i: Record<string, unknown>) => ({
          section_id: String(i?.section_id ?? ""),
          category_id: i?.category_id ? String(i.category_id) : undefined,
          quantity: Math.max(0, Number(i?.quantity ?? 0)),
        }))
        .filter((i) => i.section_id && i.quantity > 0)
    : [];

  if (!seatIds.length && !items.length) {
    return NextResponse.json(
      { error: { code: "PILIHAN_KOSONG", message: "Pilih kursi atau jumlah tiket" } },
      { status: 400 },
    );
  }

  const attendeeName = String(body.attendee_name ?? session.name ?? "Peserta").trim();
  const attendees: string[] = Array.isArray(body.attendees) ? body.attendees.map(String) : [];
  const simulatePayment = body.simulate_payment === true;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { sections: true, categories: true },
      });
      if (!event) throw new OrderError("EVENT_TIDAK_DITEMUKAN", "Event tidak ada", 404);

      const sellable = new Set(["PUBLISHED", "SALES_OPEN", "ONGOING"]);
      if (!sellable.has(event.eventStatus)) {
        throw new OrderError(
          "EVENT_TIDAK_DIJUAL",
          event.eventStatus === "CANCELLED"
            ? "Event ini dibatalkan, tiket tidak dapat dipesan"
            : `Event berstatus ${event.eventStatus}, penjualan belum dibuka`,
          409,
        );
      }

      const now = new Date();
      if (event.salesEndAt && now > event.salesEndAt) {
        throw new OrderError("PERIODE_JUAL_TUTUP", "Periode penjualan sudah berakhir", 409);
      }

      const sectionsById = new Map(event.sections.map((s) => [s.id, s]));
      const lines: {
        sectionId: string;
        categoryId: string | null;
        seatId: string | null;
        quantity: number;
        unitPrice: number;
        name: string;
      }[] = [];

      /* ---- 1. Kursi: klaim atomik satu per satu ---- */
      if (seatIds.length) {
        const seats = await tx.eventSeat.findMany({
          where: { id: { in: seatIds }, eventId },
          include: { section: true },
        });
        if (seats.length !== seatIds.length) {
          throw new OrderError("KURSI_TIDAK_DITEMUKAN", "Sebagian kursi tidak ada pada event ini", 400);
        }

        for (const seat of seats) {
          const section = sectionsById.get(seat.sectionId);
          if (!section || section.bookingType !== "BOOK_BY_SEAT") {
            throw new OrderError("KURSI_BUKAN_BOOK_BY_SEAT", `Kursi ${seat.seatLabel} bukan penjualan per kursi`);
          }
          const category = event.categories.find((c) => c.id === section.ticketCategoryId) ?? event.categories[0];
          lines.push({
            sectionId: section.id,
            categoryId: category?.id ?? null,
            seatId: seat.id,
            quantity: 1,
            unitPrice:
              category?.price ??
              (await tx.ticketPriceTier
                .findFirst({
                  where: { category: { id: category?.id ?? "" }, startsAt: { lte: now }, endsAt: { gte: now } },
                  orderBy: { startsAt: "desc" },
                })
                .then((t) => t?.price ?? 0)) ??
              0,
            name: seat.seatLabel ?? seat.id,
          });
        }

        /* Klaim atomik: update hanya kalau status masih AVAILABLE.
           count < jumlah berarti ada yang sudah diambil orang lain (double booking). */
        for (const line of lines) {
          const claimed = await tx.eventSeat.updateMany({
            where: { id: line.seatId as string, eventId, status: "AVAILABLE" },
            data: { status: "SOLD", statusSource: "ORDER" },
          });
          if (claimed.count !== 1) {
            throw new OrderError(
              "KURSI_SUDAH_DIAMBIL",
              `Kursi ${line.name} sudah dipesan orang lain. Pilih kursi lain.`,
              409,
            );
          }
        }
      }

      /* ---- 2. Kuota / standing: kurangi counter section ---- */
      for (const item of items) {
        const section = sectionsById.get(item.section_id);
        if (!section) throw new OrderError("SECTION_TIDAK_DITEMUKAN", "Section tidak ada pada event ini");
        if (section.bookingType === "BOOK_BY_SEAT") {
          throw new OrderError("SECTION_PERLU_KURSI", `Section ${section.sectionName} harus memilih kursi`);
        }

        const remaining = section.capacity - section.soldQuantity - section.blockedQuantity;
        if (item.quantity > remaining) {
          throw new OrderError(
            "KUOTA_HABIS",
            `Sisa kuota ${section.sectionName} tinggal ${remaining}, tidak cukup untuk ${item.quantity} tiket`,
            409,
          );
        }

        const category = event.categories.find((c) => c.id === item.category_id) ?? event.categories[0];
        lines.push({
          sectionId: section.id,
          categoryId: category?.id ?? null,
          seatId: null,
          quantity: item.quantity,
          unitPrice: category?.price ?? 0,
          name: section.sectionName,
        });

        await tx.eventSection.update({
          where: { id: section.id },
          data: { soldQuantity: { increment: item.quantity } },
        });
      }

      /* ---- 3. Order + item + tiket ---- */
      const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
      const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
      const seq = (await tx.order.count()) + 1;
      const orderId = `ORD-${String(Date.now()).slice(-8)}-${seq}`;
      const orderCode = `ORD-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

      const order = await tx.order.create({
        data: {
          id: orderId,
          orderCode,
          eventId,
          userId: session.userId,
          buyerSnapshot: JSON.stringify({ name: attendeeName, email: session.email ?? null }),
          orderStatus: simulatePayment ? "PAID" : "PENDING",
          quantity: totalQty,
          subtotal,
          discountAmount: 0,
          adminFee: 0,
          totalAmount: subtotal,
          currency: "IDR",
          createdAt: now,
          paidAt: simulatePayment ? now : null,
          expiresAt: new Date(now.getTime() + 7 * 60 * 1000),
        },
      });

      let seatSeq = 0;
      let ticketSeq = 0;
      for (const line of lines) {
        const orderItem = await tx.orderItem.create({
          data: {
            id: `OI-${orderId}-${++seatSeq}`,
            orderId: order.id,
            eventSectionId: line.sectionId,
            ticketCategoryId: line.categoryId,
            eventSeatId: line.seatId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.unitPrice * line.quantity,
          },
        });

        for (let i = 0; i < line.quantity; i++) {
          ticketSeq++;
          const name = attendees[ticketSeq - 1] ?? (line.quantity > 1 ? `${attendeeName} ${ticketSeq}` : attendeeName);
          await tx.ticket.create({
            data: {
              id: `TKT-${orderId}-${ticketSeq}`,
              ticketCode: `${orderCode}-${String(ticketSeq).padStart(2, "0")}`,
              orderId: order.id,
              orderItemId: orderItem.id,
              eventId,
              participantName: name,
              attendeeSequence: ticketSeq,
              eventSectionId: line.sectionId,
              eventSeatId: line.seatId,
              ticketStatus: simulatePayment ? "VALID" : "PENDING",
              attendanceStatus: "BELUM_MASUK",
              issuedAt: now,
            },
          });
        }
      }

      /* ---- 4. Pembayaran simulasi + QR ---- */
      if (simulatePayment) {
        await tx.payment.create({
          data: {
            id: `PAY-${orderId}`,
            orderId: order.id,
            provider: "SANDBOX",
            paymentMethod: "QRIS",
            providerTransactionId: `SBX-${orderCode}`,
            amount: subtotal,
            currency: "IDR",
            paymentStatus: "SUCCESS",
            initiatedAt: now,
            paidAt: now,
          },
        });
      }

      const ticketCount = await tx.ticket.count({ where: { orderId: order.id } });

      /* QR hanya terbit setelah terbayar (satu QR per order). */
      let qrToken: string | null = null;
      if (simulatePayment) {
        const { token, random } = issueQrToken(order.orderCode);
        await tx.eTicket.create({
          data: {
            id: `ETK-${random.slice(0, 10).toUpperCase()}`,
            orderId: order.id,
            eventId,
            qrTokenHash: token,
            issuedAt: now,
            ticketQuantityAtIssue: ticketCount,
            validTicketCount: ticketCount,
            maxSuccessfulScanCount: ticketCount,
            ticketStatusSummary: "UNUSED",
          },
        });
        qrToken = token;
      }

      return {
        order_id: order.id,
        order_code: order.orderCode,
        order_status: order.orderStatus,
        quantity: order.quantity,
        total_amount: order.totalAmount,
        tickets: ticketCount,
        qr_token: qrToken,
      };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message, details: err.details } },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Gagal membuat pesanan";
    return NextResponse.json(
      { error: { code: "ORDER_GAGAL", message, details: { hint: "Periksa seat_ids / items" } } },
      { status: 500 },
    );
  }
}
