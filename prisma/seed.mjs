/* Seeder: membaca data dummy JSON apa adanya lalu menormalkannya ke tabel relasional.
   Jalankan: npx prisma db seed
   Sumber: ../event_ticketing_venue_management_dummy_data.json (bisa ditimpa lewat DUMMY_JSON env). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DUMMY_PATH =
  process.env.DUMMY_JSON ?? resolve(process.cwd(), "..", "..", "..", "Downloads", "event_ticketing_venue_management_dummy_data.json");

const raw = JSON.parse(readFileSync(DUMMY_PATH, "utf-8"));

const dt = (v) => (v ? new Date(v) : null);
const json = (v) => (v === null || v === undefined ? null : JSON.stringify(v));
const num = (v) => (v === null || v === undefined ? 0 : Number(v));

/* Urutan hapus mengikuti arah foreign key (anak dulu). */
async function reset() {
  await prisma.$transaction([
    prisma.checkinRecord.deleteMany(),
    prisma.refundAdminAction.deleteMany(),
    prisma.refundStatusHistory.deleteMany(),
    prisma.refundLine.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.notificationLog.deleteMany(),
    prisma.eTicket.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.paymentGatewayCallback.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.participantChangeLog.deleteMany(),
    prisma.eventCancellationRecord.deleteMany(),
    prisma.seatBlock.deleteMany(),
    prisma.bookingHold.deleteMany(),
    prisma.queueEntry.deleteMany(),
    prisma.adminAuditLog.deleteMany(),
    prisma.eventSeat.deleteMany(),
    prisma.eventSection.deleteMany(),
    prisma.ticketCategory.deleteMany(),
    prisma.eventLayoutSnapshot.deleteMany(),
    prisma.event.deleteMany(),
    prisma.layoutTemplate.deleteMany(),
    prisma.venue.deleteMany(),
    prisma.notificationTemplate.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.systemSetting.deleteMany(),
  ]);
}

async function seedSettings() {
  const groups = raw.system_settings ?? {};
  const flat = [["booking", groups.booking], ["payment", groups.payment], ["ticket_and_checkin", groups.ticket_and_checkin], ["refund", groups.refund], ["participant", groups.participant], ["notifications", groups.notifications]];
  const rows = [];
  for (const [group, payload] of flat) {
    if (!payload) continue;
    const walk = (obj, prefix) => {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) walk(v, key);
        else rows.push({ key, value: JSON.stringify(v), valueType: typeof v === "boolean" ? "boolean" : typeof v === "number" ? "number" : Array.isArray(v) ? "json" : "string", group, note: null });
      }
    };
    walk(payload, group);
  }
  await prisma.systemSetting.createMany({ data: rows });
  return rows.length;
}

async function main() {
  await reset();

  // ---------- akses ----------
  await prisma.role.createMany({ data: raw.roles.map((r) => ({ roleId: r.role_id, roleName: r.role_name, description: r.description ?? null })) });
  await prisma.permission.createMany({ data: raw.permissions.map((p) => ({ permissionId: p.permission_id, code: p.code, description: p.description ?? null })) });

  const rolePermRows = [];
  for (const rp of raw.role_permissions) {
    for (const pid of rp.permission_ids ?? []) rolePermRows.push({ roleId: rp.role_id, permissionId: pid });
  }
  const uniqRolePerm = [...new Map(rolePermRows.map((r) => [`${r.roleId}|${r.permissionId}`, r])).values()];
  await prisma.rolePermission.createMany({ data: uniqRolePerm });

  await prisma.user.createMany({
    data: raw.users.map((u) => ({
      id: u.user_id,
      roleId: u.role_id,
      fullName: u.full_name,
      email: u.email,
      phoneNumber: u.phone_number ?? null,
      passwordHash: u.password_hash,
      accountStatus: u.account_status ?? "ACTIVE",
      createdAt: dt(u.created_at) ?? new Date(),
    })),
  });

  // ---------- venue & layout ----------
  await prisma.venue.createMany({
    data: raw.venues.map((v) => ({
      id: v.venue_id,
      venueCode: v.venue_code,
      venueName: v.venue_name,
      venueAlias: v.venue_alias ?? null,
      venueType: v.venue_type ?? null,
      floor: v.floor ?? null,
      locationLabel: v.location_label ?? null,
      masterLayoutVersion: v.master_layout_version ?? null,
      status: v.status ?? "ACTIVE",
      capacityValidationStatus: v.capacity_validation_status ?? null,
      capacityOfficial: v.capacity_official ?? null,
      notes: v.notes ?? null,
      masterLayoutElements: json(v.master_layout_elements),
    })),
  });

  await prisma.layoutTemplate.createMany({
    data: raw.layout_templates.map((t) => ({
      id: t.layout_template_id,
      venueId: t.venue_id,
      templateCode: t.template_code,
      templateName: t.template_name,
      version: String(t.version ?? "1.0"),
      sourceBlueprintPage: t.source_blueprint_page ?? null,
      selection: t.selection ?? null,
      templateStatus: t.template_status ?? "PROTOTYPE_CONCEPT",
      activeBookingTypes: json(t.active_booking_types),
      optionalBookingTypeNote: t.optional_booking_type_note ?? null,
      layoutElements: json(t.layout_elements),
      nonTicketableElements: json(t.non_ticketable_elements),
      seatGridDefinition: json(t.seat_grid_definition),
      sections: json(t.sections),
      alternativeLayoutsNotSelected: json(t.alternative_layouts_not_selected),
    })),
  });

  // ---------- event ----------
  await prisma.event.createMany({
    data: raw.events.map((e) => ({
      id: e.event_id,
      eventCode: e.event_code,
      eventName: e.event_name,
      description: e.description ?? null,
      venueId: e.venue_id,
      layoutTemplateId: e.layout_template_id ?? null,
      eventStatus: e.event_status,
      startAt: dt(e.start_at),
      endAt: dt(e.end_at),
      timezone: e.timezone ?? "Asia/Jakarta",
      salesStartAt: dt(e.sales_start_at),
      salesEndAt: dt(e.sales_end_at),
      publishedAt: dt(e.published_at),
      createdBy: e.created_by ?? null,
      currency: e.currency ?? "IDR",
      cancelledAt: dt(e.cancelled_at),
      cancelledBy: e.cancelled_by ?? null,
      cancelReason: e.cancel_reason ?? null,
    })),
  });

  await prisma.eventLayoutSnapshot.createMany({
    data: raw.event_layout_snapshots.map((s) => ({
      id: s.snapshot_id,
      eventId: s.event_id,
      layoutTemplateId: s.layout_template_id ?? null,
      templateVersion: s.template_version ? String(s.template_version) : null,
      snapshotStatus: s.snapshot_status,
      createdAt: dt(s.snapshot_created_at) ?? new Date(),
      note: s.note ?? null,
      snapshotPayload: json(s.snapshot_payload),
    })),
  });

  // kategori dulu, lalu section (section menunjuk category)
  await prisma.ticketCategory.createMany({
    data: raw.ticket_categories.map((c) => ({
      id: c.ticket_category_id,
      eventId: c.event_id,
      eventSectionId: c.event_section_id ?? null,
      categoryName: c.category_name,
      price: num(c.price),
      currency: c.currency ?? "IDR",
      quota: num(c.quota),
      saleStartAt: dt(c.sale_start_at),
      saleEndAt: dt(c.sale_end_at),
      status: c.status ?? "OPEN",
    })),
  });

  await prisma.eventSection.createMany({
    data: raw.event_sections.map((s) => ({
      id: s.event_section_id,
      eventId: s.event_id,
      sectionId: s.section_id,
      sectionName: s.section_name,
      bookingType: s.booking_type,
      ticketCategoryId: s.ticket_category_id ?? null,
      inventoryStatus: s.inventory_status ?? "ACTIVE",
      capacity: num(s.capacity),
      blockedQuantity: num(s.blocked_quantity),
      reservedQuantity: num(s.reserved_quantity),
      soldQuantity: num(s.sold_quantity),
      availableQuantity: num(s.available_quantity),
      cancelledQuantity: num(s.cancelled_quantity),
      capacityIsDummy: s.capacity_is_dummy ?? true,
    })),
  });

  /* event_seats.section_id di JSON memakai ID master (SEC-*), bukan event_section_id (EVS-*).
     Petakan lewat pasangan event + section master. */
  const sectionMap = new Map(
    raw.event_sections.map((s) => [`${s.event_id}|${s.section_id}`, s.event_section_id]),
  );
  const unresolved = [];
  const seatRows = raw.event_seats.map((s) => {
    const mapped = sectionMap.get(`${s.event_id}|${s.section_id}`);
    if (!mapped) unresolved.push(`${s.event_seat_id}:${s.event_id}|${s.section_id}`);
    return { ...s, __eventSectionId: mapped ?? null };
  });
  if (unresolved.length) console.warn("Seat tanpa section valid:", unresolved.slice(0, 5), "total", unresolved.length);

  await prisma.eventSeat.createMany({
    data: seatRows.filter((s) => s.__eventSectionId).map((s) => ({
      id: s.event_seat_id,
      eventId: s.event_id,
      sectionId: s.__eventSectionId,
      blockCode: s.block_code ?? null,
      rowLabel: s.row_label,
      seatNumber: s.seat_number,
      seatLabel: s.seat_label,
      position: json(s.position),
      status: s.status ?? "AVAILABLE",
      statusSource: s.status_source ?? null,
      currentOrderId: s.current_order_id ?? null,
      blockedReason: s.blocked_reason ?? null,
    })),
  });

  await prisma.seatBlock.createMany({
    data: raw.seat_blocks.map((b) => ({
      id: b.seat_block_id,
      eventId: b.event_id,
      eventSeatId: b.event_seat_id,
      reason: b.reason ?? null,
      blockedBy: b.blocked_by ?? null,
      blockedAt: dt(b.blocked_at) ?? new Date(),
      status: b.status ?? "ACTIVE",
    })),
  });

  await prisma.queueEntry.createMany({
    data: raw.queue_entries.map((q) => ({
      id: q.queue_entry_id,
      eventId: q.event_id,
      userId: q.user_id,
      queueNumber: q.queue_number,
      queueToken: q.queue_token,
      enteredAt: dt(q.entered_at) ?? new Date(),
      status: q.status ?? "WAITING",
      servedAt: dt(q.served_at),
      note: q.note ?? null,
    })),
  });

  await prisma.bookingHold.createMany({
    data: raw.booking_holds.map((h) => ({
      id: h.hold_id,
      eventId: h.event_id,
      userId: h.user_id,
      orderId: h.order_id ?? null,
      eventSeatIds: json(h.event_seat_ids),
      sectionId: h.section_id ? sectionMap.get(`${h.event_id}|${h.section_id}`) ?? null : null,
      quantity: num(h.quantity) || 1,
      holdStartedAt: dt(h.hold_started_at) ?? new Date(),
      reservedUntil: dt(h.reserved_until) ?? new Date(),
      status: h.status ?? "ACTIVE",
      releasedAt: dt(h.released_at),
      releaseReason: h.release_reason ?? null,
    })),
  });

  // ---------- order ----------
  await prisma.order.createMany({
    data: raw.orders.map((o) => ({
      id: o.order_id,
      orderCode: o.order_code,
      eventId: o.event_id,
      userId: o.user_id,
      buyerSnapshot: json(o.buyer_snapshot),
      orderStatus: o.order_status,
      quantity: num(o.quantity) || 1,
      subtotal: num(o.subtotal),
      discountAmount: num(o.discount_amount),
      adminFee: num(o.admin_fee),
      totalAmount: num(o.total_amount),
      currency: o.currency ?? "IDR",
      createdAt: dt(o.created_at) ?? new Date(),
      paidAt: dt(o.paid_at),
      cancelledAt: dt(o.cancelled_at),
      expiresAt: o.created_at ? new Date(new Date(o.created_at).getTime() + 7 * 60 * 1000) : null,
    })),
  });

  await prisma.orderItem.createMany({
    data: raw.order_items.map((i) => ({
      id: i.order_item_id,
      orderId: i.order_id,
      eventSectionId: i.event_section_id ?? null,
      ticketCategoryId: i.ticket_category_id ?? null,
      eventSeatId: i.event_seat_id ?? null,
      quantity: num(i.quantity) || 1,
      unitPrice: num(i.unit_price),
      lineTotal: num(i.line_total),
    })),
  });

  await prisma.payment.createMany({
    data: raw.payments.map((p) => ({
      id: p.payment_id,
      orderId: p.order_id,
      provider: p.provider ?? "SANDBOX_QRIS",
      paymentMethod: p.payment_method ?? "QRIS",
      providerTransactionId: p.provider_transaction_id ?? null,
      amount: num(p.amount),
      currency: p.currency ?? "IDR",
      paymentStatus: p.payment_status,
      initiatedAt: dt(p.initiated_at) ?? new Date(),
      paidAt: dt(p.paid_at),
      expiresAt: dt(p.expires_at),
      gatewayRefundStatus: p.gateway_refund_status ?? null,
    })),
  });

  await prisma.paymentGatewayCallback.createMany({
    data: raw.payment_gateway_callbacks.map((c) => ({
      id: c.callback_id,
      paymentId: c.payment_id,
      providerEventId: c.provider_event_id,
      eventType: c.event_type,
      receivedAt: dt(c.received_at) ?? new Date(),
      signatureValid: Boolean(c.signature_valid),
      idempotencyKey: c.idempotency_key ?? null,
      processingResult: c.processing_result ?? null,
    })),
  });

  // ---------- tiket & QR ----------
  await prisma.ticket.createMany({
    data: raw.tickets.map((t) => ({
      id: t.ticket_id,
      ticketCode: t.ticket_code,
      orderId: t.order_id,
      orderItemId: t.order_item_id ?? null,
      eventId: t.event_id,
      participantName: t.participant_name,
      attendeeSequence: num(t.attendee_sequence) || 1,
      eventSectionId: t.event_section_id ?? null,
      eventSeatId: t.event_seat_id ?? null,
      ticketStatus: t.ticket_status,
      attendanceStatus: t.attendance_status ?? "NOT_CHECKED_IN",
      issuedAt: dt(t.issued_at),
      invalidatedAt: dt(t.invalidated_at),
      nameLastUpdatedAt: dt(t.name_last_updated_at),
    })),
  });

  await prisma.eTicket.createMany({
    data: raw.e_tickets.map((e) => ({
      id: e.e_ticket_id,
      orderId: e.order_id,
      eventId: e.event_id,
      qrTokenHash: e.qr_token_hash,
      qrPayloadVersion: num(e.qr_payload_version) || 1,
      issuedAt: dt(e.issued_at) ?? new Date(),
      invalidatedAt: dt(e.invalidated_at),
      ticketQuantityAtIssue: num(e.ticket_quantity_at_issue),
      validTicketCount: num(e.valid_ticket_count),
      successfulScanCount: num(e.successful_scan_count),
      maxSuccessfulScanCount: num(e.max_successful_scan_count),
      ticketStatusSummary: e.ticket_status_summary ?? null,
      deliveryNotificationId: e.delivery_notification_id ?? null,
    })),
  });

  await prisma.checkinRecord.createMany({
    data: raw.checkin_records.map((c) => ({
      id: c.checkin_record_id,
      eTicketId: c.e_ticket_id,
      orderId: c.order_id,
      ticketId: c.ticket_id ?? null,
      eventId: c.event_id,
      scanSequence: num(c.scan_sequence) || 1,
      scanResult: c.scan_result,
      scannedAt: dt(c.scanned_at) ?? new Date(),
      checkedBy: c.checked_by ?? null,
      deviceId: c.device_id ?? null,
      rejectionReason: c.rejection_reason ?? null,
    })),
  });

  // ---------- refund ----------
  await prisma.refund.createMany({
    data: raw.refunds.map((r) => {
      const dest = r.refund_destination ?? {};
      const mt = r.manual_transfer ?? {};
      return {
        id: r.refund_id,
        refundCode: r.refund_code,
        refundType: r.refund_type,
        eventId: r.event_id,
        orderId: r.order_id,
        requestedByUserId: r.requested_by_user_id ?? null,
        quantity: num(r.quantity) || 1,
        refundAmount: num(r.refund_amount),
        currency: r.currency ?? "IDR",
        status: r.status,
        refundDataStatus: r.refund_data_status ?? "NOT_SUBMITTED",
        missingDestinationFields: json(r.missing_destination_fields),
        approvalRequired: r.approval_required ?? true,
        approvalMode: r.approval_mode ?? null,
        requestedAt: dt(r.requested_at) ?? new Date(),
        dataCompletedAt: dt(r.data_completed_at),
        approvedAt: dt(r.approved_at),
        rejectedAt: dt(r.rejected_at),
        processingStartedAt: dt(r.processing_started_at),
        completedAt: dt(r.completed_at),
        targetCompletionDays: r.target_completion_days ?? null,
        targetCompletionDueAt: dt(r.target_completion_due_at),
        targetCompletionClockStart: r.target_completion_clock_start ?? null,
        completionNotificationMode: r.completion_notification_mode ?? null,
        completionNotificationId: r.completion_notification_id ?? null,
        destMethod: dest.method ?? null,
        destProviderName: dest.provider_name ?? null,
        destAccountNumber: dest.account_number ?? null,
        destAccountHolder: dest.account_holder_name ?? null,
        destIsDummy: dest.destination_data_dummy ?? true,
        manualProcessedBy: mt.processed_by ?? null,
        manualTransferRef: mt.transfer_reference ?? null,
        manualTransferDate: dt(mt.transfer_date),
        manualProofRef: mt.proof_reference ?? null,
        manualAdminNote: mt.admin_note ?? null,
      };
    }),
  });

  /* ticket_ids di JSON berupa array; dipecah jadi baris refund_lines. */
  const refundLineRows = [];
  for (const r of raw.refunds) {
    const ids = r.ticket_ids ?? [];
    const perTicket = ids.length ? Math.round(num(r.refund_amount) / ids.length) : 0;
    ids.forEach((tid, i) =>
      refundLineRows.push({
        id: `RFL-${r.refund_id.replace(/^RFD-/, "")}-${i + 1}`,
        refundId: r.refund_id,
        ticketId: tid,
        orderId: r.order_id,
        amount: perTicket,
      }),
    );
  }
  const uniqRefundLines = [...new Map(refundLineRows.map((r) => [`${r.refundId}|${r.ticketId}`, r])).values()];
  if (uniqRefundLines.length) await prisma.refundLine.createMany({ data: uniqRefundLines });

  await prisma.refundStatusHistory.createMany({
    data: raw.refund_status_histories.map((h) => ({
      id: h.history_id,
      refundId: h.refund_id,
      fromStatus: h.from_status ?? null,
      toStatus: h.to_status,
      changedAt: dt(h.changed_at) ?? new Date(),
      changedBy: h.changed_by ?? null,
      reason: h.reason ?? null,
    })),
  });

  await prisma.refundAdminAction.createMany({
    data: raw.refund_admin_actions.map((a) => ({
      id: a.action_id,
      refundId: a.refund_id,
      actionType: a.action_type,
      performedBy: a.performed_by ?? null,
      performedAt: dt(a.performed_at) ?? new Date(),
      result: a.result ?? null,
      note: a.note ?? null,
    })),
  });

  // ---------- notifikasi ----------
  await prisma.notificationTemplate.createMany({
    data: raw.notification_templates.map((t) => ({
      id: t.template_id,
      channel: t.channel ?? "WHATSAPP",
      templateName: t.template_name,
      triggerMode: t.trigger_mode,
      active: t.active ?? true,
      message: t.message,
    })),
  });

  await prisma.notificationLog.createMany({
    data: raw.notification_logs.map((n) => ({
      id: n.notification_id,
      templateId: n.template_id ?? null,
      eventId: n.event_id ?? null,
      orderId: n.order_id ?? null,
      refundId: n.refund_id ?? null,
      recipientUserId: n.recipient_user_id ?? null,
      recipientPhone: n.recipient_phone ?? null,
      channel: n.channel ?? "WHATSAPP",
      triggerMode: n.trigger_mode ?? null,
      notificationType: n.notification_type ?? null,
      status: n.status ?? "QUEUED",
      sentAt: dt(n.sent_at),
      sentBy: n.sent_by ?? null,
      messagePreview: n.message_preview ?? null,
    })),
  });

  // ---------- audit & operasional ----------
  await prisma.adminAuditLog.createMany({
    data: raw.admin_audit_logs.map((a) => ({
      id: a.audit_id,
      actorUserId: a.actor_user_id ?? null,
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      occurredAt: dt(a.occurred_at) ?? new Date(),
      details: json(a.details),
    })),
  });

  await prisma.participantChangeLog.createMany({
    data: raw.participant_change_logs.map((c) => ({
      id: c.change_log_id,
      ticketId: c.ticket_id,
      changedBy: c.changed_by ?? null,
      oldParticipantName: c.old_participant_name ?? null,
      newParticipantName: c.new_participant_name ?? null,
      changedAt: dt(c.changed_at) ?? new Date(),
      changeType: c.change_type,
      note: c.note ?? null,
    })),
  });

  await prisma.eventCancellationRecord.createMany({
    data: raw.event_cancellation_records.map((c) => ({
      id: c.cancellation_id,
      eventId: c.event_id,
      cancelledBy: c.cancelled_by ?? null,
      cancelledAt: dt(c.cancelled_at) ?? new Date(),
      reason: c.reason ?? null,
      affectedOrderIds: json(c.affected_order_ids),
      affectedTicketIds: json(c.affected_ticket_ids),
      refundFlow: c.refund_flow ?? null,
      customerNotificationTemplateId: c.customer_notification_template_id ?? null,
      autoRefundExecuted: c.auto_refund_executed ?? false,
    })),
  });

  const settingCount = await seedSettings();

  const counts = {
    roles: await prisma.role.count(),
    users: await prisma.user.count(),
    venues: await prisma.venue.count(),
    events: await prisma.event.count(),
    sections: await prisma.eventSection.count(),
    seats: await prisma.eventSeat.count(),
    orders: await prisma.order.count(),
    tickets: await prisma.ticket.count(),
    eTickets: await prisma.eTicket.count(),
    refunds: await prisma.refund.count(),
    refundLines: await prisma.refundLine.count(),
    settings: settingCount,
  };
  console.log("Seed selesai:", counts);
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
