-- CreateTable
CREATE TABLE "ticket_price_tiers" (
    "tier_id" TEXT NOT NULL PRIMARY KEY,
    "ticket_category_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME NOT NULL,
    "is_promo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_price_tiers_ticket_category_id_fkey" FOREIGN KEY ("ticket_category_id") REFERENCES "ticket_categories" ("ticket_category_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ticket_price_tiers_ticket_category_id_starts_at_idx" ON "ticket_price_tiers"("ticket_category_id", "starts_at");
