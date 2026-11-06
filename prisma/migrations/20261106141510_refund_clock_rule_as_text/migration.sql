-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_refunds" (
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
    "target_completion_clock_start" TEXT,
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
INSERT INTO "new_refunds" ("approval_mode", "approval_required", "approved_at", "completed_at", "completion_notification_id", "completion_notification_mode", "currency", "data_completed_at", "dest_account_holder", "dest_account_number", "dest_is_dummy", "dest_method", "dest_provider_name", "event_id", "manual_admin_note", "manual_processed_by", "manual_proof_reference", "manual_transfer_date", "manual_transfer_reference", "missing_destination_fields", "order_id", "processing_started_at", "quantity", "refund_amount", "refund_code", "refund_data_status", "refund_id", "refund_type", "rejected_at", "requested_at", "requested_by_user_id", "status", "target_completion_clock_start", "target_completion_days", "target_completion_due_at") SELECT "approval_mode", "approval_required", "approved_at", "completed_at", "completion_notification_id", "completion_notification_mode", "currency", "data_completed_at", "dest_account_holder", "dest_account_number", "dest_is_dummy", "dest_method", "dest_provider_name", "event_id", "manual_admin_note", "manual_processed_by", "manual_proof_reference", "manual_transfer_date", "manual_transfer_reference", "missing_destination_fields", "order_id", "processing_started_at", "quantity", "refund_amount", "refund_code", "refund_data_status", "refund_id", "refund_type", "rejected_at", "requested_at", "requested_by_user_id", "status", "target_completion_clock_start", "target_completion_days", "target_completion_due_at" FROM "refunds";
DROP TABLE "refunds";
ALTER TABLE "new_refunds" RENAME TO "refunds";
CREATE UNIQUE INDEX "refunds_refund_code_key" ON "refunds"("refund_code");
CREATE INDEX "refunds_event_id_idx" ON "refunds"("event_id");
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");
CREATE INDEX "refunds_status_idx" ON "refunds"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
