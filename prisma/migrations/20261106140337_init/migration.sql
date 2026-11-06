-- CreateTable
CREATE TABLE "roles" (
    "role_id" TEXT NOT NULL PRIMARY KEY,
    "role_name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    PRIMARY KEY ("role_id", "permission_id"),
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "role_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "password_hash" TEXT NOT NULL,
    "account_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "venues" (
    "venue_id" TEXT NOT NULL PRIMARY KEY,
    "venue_code" TEXT NOT NULL,
    "venue_name" TEXT NOT NULL,
    "venue_alias" TEXT,
    "venue_type" TEXT,
    "floor" TEXT,
    "location_label" TEXT,
    "master_layout_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "capacity_validation_status" TEXT,
    "capacity_official" INTEGER,
    "notes" TEXT,
    "master_layout_elements" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "layout_templates" (
    "layout_template_id" TEXT NOT NULL PRIMARY KEY,
    "venue_id" TEXT NOT NULL,
    "template_code" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "source_blueprint_page" INTEGER,
    "selection" TEXT,
    "template_status" TEXT NOT NULL,
    "active_booking_types" TEXT,
    "optional_booking_type_note" TEXT,
    "layout_elements" TEXT,
    "non_ticketable_elements" TEXT,
    "seat_grid_definition" TEXT,
    "sections" TEXT,
    "alternative_layouts_not_selected" TEXT,
    CONSTRAINT "layout_templates_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues" ("venue_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "event_id" TEXT NOT NULL PRIMARY KEY,
    "event_code" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "description" TEXT,
    "venue_id" TEXT NOT NULL,
    "layout_template_id" TEXT,
    "event_status" TEXT NOT NULL,
    "start_at" DATETIME NOT NULL,
    "end_at" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "sales_start_at" DATETIME,
    "sales_end_at" DATETIME,
    "published_at" DATETIME,
    "created_by" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "cancelled_at" DATETIME,
    "cancelled_by" TEXT,
    "cancel_reason" TEXT,
    CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues" ("venue_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "events_layout_template_id_fkey" FOREIGN KEY ("layout_template_id") REFERENCES "layout_templates" ("layout_template_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_layout_snapshots" (
    "snapshot_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "layout_template_id" TEXT,
    "template_version" TEXT,
    "snapshot_status" TEXT NOT NULL,
    "snapshot_created_at" DATETIME NOT NULL,
    "note" TEXT,
    "snapshot_payload" TEXT,
    CONSTRAINT "event_layout_snapshots_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "event_layout_snapshots_layout_template_id_fkey" FOREIGN KEY ("layout_template_id") REFERENCES "layout_templates" ("layout_template_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_sections" (
    "event_section_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "section_name" TEXT NOT NULL,
    "booking_type" TEXT NOT NULL,
    "ticket_category_id" TEXT,
    "inventory_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "capacity" INTEGER NOT NULL,
    "blocked_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "sold_quantity" INTEGER NOT NULL DEFAULT 0,
    "available_quantity" INTEGER NOT NULL DEFAULT 0,
    "cancelled_quantity" INTEGER NOT NULL DEFAULT 0,
    "capacity_is_dummy" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "event_sections_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_sections_ticket_category_id_fkey" FOREIGN KEY ("ticket_category_id") REFERENCES "ticket_categories" ("ticket_category_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ticket_categories" (
    "ticket_category_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "event_section_id" TEXT,
    "category_name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "quota" INTEGER NOT NULL,
    "sale_start_at" DATETIME,
    "sale_end_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    CONSTRAINT "ticket_categories_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_seats" (
    "event_seat_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "block_code" TEXT,
    "row_label" TEXT NOT NULL,
    "seat_number" TEXT NOT NULL,
    "seat_label" TEXT NOT NULL,
    "position" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "status_source" TEXT,
    "current_order_id" TEXT,
    "blocked_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "event_seats_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_seats_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "event_sections" ("event_section_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seat_blocks" (
    "seat_block_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "event_seat_id" TEXT NOT NULL,
    "reason" TEXT,
    "blocked_by" TEXT,
    "blocked_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "seat_blocks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seat_blocks_event_seat_id_fkey" FOREIGN KEY ("event_seat_id") REFERENCES "event_seats" ("event_seat_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seat_blocks_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "queue_entries" (
    "queue_entry_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "queue_number" INTEGER NOT NULL,
    "queue_token" TEXT NOT NULL,
    "entered_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "served_at" DATETIME,
    "note" TEXT,
    CONSTRAINT "queue_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "queue_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "booking_holds" (
    "hold_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "event_seat_ids" TEXT,
    "section_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "hold_started_at" DATETIME NOT NULL,
    "reserved_until" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "released_at" DATETIME,
    "release_reason" TEXT,
    CONSTRAINT "booking_holds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "booking_holds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "booking_holds_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "event_sections" ("event_section_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" TEXT NOT NULL PRIMARY KEY,
    "order_code" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "buyer_snapshot" TEXT,
    "order_status" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" INTEGER NOT NULL,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "admin_fee" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "created_at" DATETIME NOT NULL,
    "paid_at" DATETIME,
    "cancelled_at" DATETIME,
    "expires_at" DATETIME,
    CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_items" (
    "order_item_id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "event_section_id" TEXT,
    "ticket_category_id" TEXT,
    "event_seat_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_event_section_id_fkey" FOREIGN KEY ("event_section_id") REFERENCES "event_sections" ("event_section_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_items_ticket_category_id_fkey" FOREIGN KEY ("ticket_category_id") REFERENCES "ticket_categories" ("ticket_category_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_items_event_seat_id_fkey" FOREIGN KEY ("event_seat_id") REFERENCES "event_seats" ("event_seat_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SANDBOX_QRIS',
    "payment_method" TEXT NOT NULL,
    "provider_transaction_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "payment_status" TEXT NOT NULL,
    "initiated_at" DATETIME NOT NULL,
    "paid_at" DATETIME,
    "expires_at" DATETIME,
    "gateway_refund_status" TEXT,
    CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_gateway_callbacks" (
    "callback_id" TEXT NOT NULL PRIMARY KEY,
    "payment_id" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "received_at" DATETIME NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_key" TEXT,
    "processing_result" TEXT,
    CONSTRAINT "payment_gateway_callbacks_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("payment_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tickets" (
    "ticket_id" TEXT NOT NULL PRIMARY KEY,
    "ticket_code" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "event_id" TEXT NOT NULL,
    "participant_name" TEXT NOT NULL,
    "attendee_sequence" INTEGER NOT NULL DEFAULT 1,
    "event_section_id" TEXT,
    "event_seat_id" TEXT,
    "ticket_status" TEXT NOT NULL,
    "attendance_status" TEXT NOT NULL DEFAULT 'NOT_CHECKED_IN',
    "issued_at" DATETIME,
    "invalidated_at" DATETIME,
    "name_last_updated_at" DATETIME,
    CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items" ("order_item_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_event_section_id_fkey" FOREIGN KEY ("event_section_id") REFERENCES "event_sections" ("event_section_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_event_seat_id_fkey" FOREIGN KEY ("event_seat_id") REFERENCES "event_seats" ("event_seat_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "e_tickets" (
    "e_ticket_id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "qr_token_hash" TEXT NOT NULL,
    "qr_payload_version" INTEGER NOT NULL DEFAULT 1,
    "issued_at" DATETIME NOT NULL,
    "invalidated_at" DATETIME,
    "ticket_quantity_at_issue" INTEGER NOT NULL,
    "valid_ticket_count" INTEGER NOT NULL,
    "successful_scan_count" INTEGER NOT NULL DEFAULT 0,
    "max_successful_scan_count" INTEGER NOT NULL,
    "ticket_status_summary" TEXT,
    "delivery_notification_id" TEXT,
    CONSTRAINT "e_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "e_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "checkin_records" (
    "checkin_record_id" TEXT NOT NULL PRIMARY KEY,
    "e_ticket_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "event_id" TEXT NOT NULL,
    "scan_sequence" INTEGER NOT NULL,
    "scan_result" TEXT NOT NULL,
    "scanned_at" DATETIME NOT NULL,
    "checked_by" TEXT,
    "device_id" TEXT,
    "rejection_reason" TEXT,
    CONSTRAINT "checkin_records_e_ticket_id_fkey" FOREIGN KEY ("e_ticket_id") REFERENCES "e_tickets" ("e_ticket_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "checkin_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "checkin_records_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("ticket_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "checkin_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "checkin_records_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refunds" (
    "refund_id" TEXT NOT NULL PRIMARY KEY,
    "refund_code" TEXT NOT NULL,
    "refund_type" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "refund_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL,
    "refund_data_status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "missing_destination_fields" TEXT,
    "approval_required" BOOLEAN NOT NULL DEFAULT true,
    "approval_mode" TEXT,
    "requested_at" DATETIME NOT NULL,
    "data_completed_at" DATETIME,
    "approved_at" DATETIME,
    "rejected_at" DATETIME,
    "processing_started_at" DATETIME,
    "completed_at" DATETIME,
    "target_completion_days" INTEGER,
    "target_completion_due_at" DATETIME,
    "target_completion_clock_start" DATETIME,
    "completion_notification_mode" TEXT,
    "completion_notification_id" TEXT,
    "dest_method" TEXT,
    "dest_provider_name" TEXT,
    "dest_account_number" TEXT,
    "dest_account_holder" TEXT,
    "dest_is_dummy" BOOLEAN NOT NULL DEFAULT true,
    "manual_processed_by" TEXT,
    "manual_transfer_reference" TEXT,
    "manual_transfer_date" DATETIME,
    "manual_proof_reference" TEXT,
    "manual_admin_note" TEXT,
    CONSTRAINT "refunds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "refunds_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refund_lines" (
    "refund_line_id" TEXT NOT NULL PRIMARY KEY,
    "refund_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "refund_lines_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds" ("refund_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "refund_lines_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "refund_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refund_status_histories" (
    "history_id" TEXT NOT NULL PRIMARY KEY,
    "refund_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_at" DATETIME NOT NULL,
    "changed_by" TEXT,
    "reason" TEXT,
    CONSTRAINT "refund_status_histories_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds" ("refund_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refund_admin_actions" (
    "action_id" TEXT NOT NULL PRIMARY KEY,
    "refund_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "performed_by" TEXT,
    "performed_at" DATETIME NOT NULL,
    "result" TEXT,
    "note" TEXT,
    CONSTRAINT "refund_admin_actions_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds" ("refund_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "template_id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "template_name" TEXT NOT NULL,
    "trigger_mode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "notification_id" TEXT NOT NULL PRIMARY KEY,
    "template_id" TEXT,
    "event_id" TEXT,
    "order_id" TEXT,
    "refund_id" TEXT,
    "recipient_user_id" TEXT,
    "recipient_phone" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "trigger_mode" TEXT,
    "notification_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "sent_at" DATETIME,
    "sent_by" TEXT,
    "message_preview" TEXT,
    CONSTRAINT "notification_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates" ("template_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notification_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notification_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notification_logs_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds" ("refund_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notification_logs_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "audit_id" TEXT NOT NULL PRIMARY KEY,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "occurred_at" DATETIME NOT NULL,
    "details" TEXT,
    CONSTRAINT "admin_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "participant_change_logs" (
    "change_log_id" TEXT NOT NULL PRIMARY KEY,
    "ticket_id" TEXT NOT NULL,
    "changed_by" TEXT,
    "old_participant_name" TEXT,
    "new_participant_name" TEXT,
    "changed_at" DATETIME NOT NULL,
    "change_type" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "participant_change_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("ticket_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "participant_change_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_cancellation_records" (
    "cancellation_id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "cancelled_by" TEXT,
    "cancelled_at" DATETIME NOT NULL,
    "reason" TEXT,
    "affected_order_ids" TEXT,
    "affected_ticket_ids" TEXT,
    "refund_flow" TEXT,
    "customer_notification_template_id" TEXT,
    "auto_refund_executed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "event_cancellation_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("event_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_cancellation_records_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "value_type" TEXT NOT NULL,
    "group" TEXT,
    "note" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "layout_templates_venue_id_idx" ON "layout_templates"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_event_code_key" ON "events"("event_code");

-- CreateIndex
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");

-- CreateIndex
CREATE INDEX "events_event_status_idx" ON "events"("event_status");

-- CreateIndex
CREATE INDEX "events_start_at_idx" ON "events"("start_at");

-- CreateIndex
CREATE INDEX "event_layout_snapshots_event_id_idx" ON "event_layout_snapshots"("event_id");

-- CreateIndex
CREATE INDEX "event_sections_event_id_idx" ON "event_sections"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_sections_event_id_section_id_key" ON "event_sections"("event_id", "section_id");

-- CreateIndex
CREATE INDEX "ticket_categories_event_id_idx" ON "ticket_categories"("event_id");

-- CreateIndex
CREATE INDEX "event_seats_event_id_status_idx" ON "event_seats"("event_id", "status");

-- CreateIndex
CREATE INDEX "event_seats_section_id_idx" ON "event_seats"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_seats_event_id_seat_label_key" ON "event_seats"("event_id", "seat_label");

-- CreateIndex
CREATE INDEX "seat_blocks_event_id_idx" ON "seat_blocks"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "queue_entries_queue_token_key" ON "queue_entries"("queue_token");

-- CreateIndex
CREATE INDEX "queue_entries_event_id_status_idx" ON "queue_entries"("event_id", "status");

-- CreateIndex
CREATE INDEX "queue_entries_event_id_queue_number_idx" ON "queue_entries"("event_id", "queue_number");

-- CreateIndex
CREATE INDEX "booking_holds_event_id_status_idx" ON "booking_holds"("event_id", "status");

-- CreateIndex
CREATE INDEX "booking_holds_reserved_until_idx" ON "booking_holds"("reserved_until");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE INDEX "orders_event_id_idx" ON "orders"("event_id");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_order_status_idx" ON "orders"("order_status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_id_key" ON "payments"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_payment_status_idx" ON "payments"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_callbacks_provider_event_id_key" ON "payment_gateway_callbacks"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_callbacks_idempotency_key_key" ON "payment_gateway_callbacks"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_gateway_callbacks_payment_id_idx" ON "payment_gateway_callbacks"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_code_key" ON "tickets"("ticket_code");

-- CreateIndex
CREATE INDEX "tickets_order_id_idx" ON "tickets"("order_id");

-- CreateIndex
CREATE INDEX "tickets_event_id_ticket_status_idx" ON "tickets"("event_id", "ticket_status");

-- CreateIndex
CREATE INDEX "tickets_event_seat_id_idx" ON "tickets"("event_seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "e_tickets_order_id_key" ON "e_tickets"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "e_tickets_qr_token_hash_key" ON "e_tickets"("qr_token_hash");

-- CreateIndex
CREATE INDEX "e_tickets_event_id_idx" ON "e_tickets"("event_id");

-- CreateIndex
CREATE INDEX "checkin_records_event_id_scanned_at_idx" ON "checkin_records"("event_id", "scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_records_e_ticket_id_scan_sequence_key" ON "checkin_records"("e_ticket_id", "scan_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refund_code_key" ON "refunds"("refund_code");

-- CreateIndex
CREATE INDEX "refunds_event_id_idx" ON "refunds"("event_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refund_lines_ticket_id_idx" ON "refund_lines"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_lines_refund_id_ticket_id_key" ON "refund_lines"("refund_id", "ticket_id");

-- CreateIndex
CREATE INDEX "refund_status_histories_refund_id_changed_at_idx" ON "refund_status_histories"("refund_id", "changed_at");

-- CreateIndex
CREATE INDEX "refund_admin_actions_refund_id_idx" ON "refund_admin_actions"("refund_id");

-- CreateIndex
CREATE INDEX "notification_logs_event_id_idx" ON "notification_logs"("event_id");

-- CreateIndex
CREATE INDEX "notification_logs_order_id_idx" ON "notification_logs"("order_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_entity_id_idx" ON "admin_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "participant_change_logs_ticket_id_idx" ON "participant_change_logs"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_cancellation_records_event_id_key" ON "event_cancellation_records"("event_id");
