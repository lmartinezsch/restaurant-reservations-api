-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "shifts" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSize" INTEGER NOT NULL,
    "maxSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "startDateTimeISO" TEXT NOT NULL,
    "endDateTimeISO" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerCreatedAt" TEXT NOT NULL,
    "customerUpdatedAt" TEXT NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_tables" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "reservation_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locks" (
    "id" TEXT NOT NULL,
    "lockKey" TEXT NOT NULL,
    "acquiredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sectors_restaurantId_idx" ON "sectors"("restaurantId");

-- CreateIndex
CREATE INDEX "tables_sectorId_idx" ON "tables"("sectorId");

-- CreateIndex
CREATE INDEX "reservations_restaurantId_idx" ON "reservations"("restaurantId");

-- CreateIndex
CREATE INDEX "reservations_sectorId_idx" ON "reservations"("sectorId");

-- CreateIndex
CREATE INDEX "reservations_startDateTimeISO_idx" ON "reservations"("startDateTimeISO");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservation_tables_reservationId_idx" ON "reservation_tables"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_tables_tableId_idx" ON "reservation_tables"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_tables_reservationId_tableId_key" ON "reservation_tables"("reservationId", "tableId");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_key_idx" ON "idempotency_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "locks_lockKey_key" ON "locks"("lockKey");

-- CreateIndex
CREATE INDEX "locks_lockKey_idx" ON "locks"("lockKey");

-- CreateIndex
CREATE INDEX "locks_expiresAt_idx" ON "locks"("expiresAt");

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
