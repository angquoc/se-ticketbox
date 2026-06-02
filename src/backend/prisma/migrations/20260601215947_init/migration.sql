-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ORGANIZER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ConcertStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'CHECKED_IN', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concert" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "artistBio" TEXT,
    "venue" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "salesStartAt" TIMESTAMP(3),
    "status" "ConcertStatus" NOT NULL DEFAULT 'DRAFT',
    "seatMapUrl" TEXT,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "totalQty" INTEGER NOT NULL,
    "soldQty" INTEGER NOT NULL DEFAULT 0,
    "maxPerUser" INTEGER NOT NULL,
    "salesStartAt" TIMESTAMP(3) NOT NULL,
    "salesEndAt" TIMESTAMP(3),

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "transactionCode" TEXT NOT NULL,
    "paymentUrl" TEXT,
    "rawWebhook" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "qrSignature" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "checkedInAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckinLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "conflict" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CheckinLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestListEntry" (
    "id" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "sponsorName" TEXT,
    "qrPayload" TEXT,
    "checkedInAt" TIMESTAMP(3),

    CONSTRAINT "GuestListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "concertId" TEXT,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Concert_slug_key" ON "Concert"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TicketType_concertId_name_key" ON "TicketType"("concertId", "name");

-- CreateIndex
CREATE INDEX "Order_concertId_status_idx" ON "Order"("concertId", "status");

-- CreateIndex
CREATE INDEX "Order_expiresAt_idx" ON "Order"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionCode_key" ON "Payment"("transactionCode");

-- CreateIndex
CREATE INDEX "Ticket_ticketTypeId_idx" ON "Ticket"("ticketTypeId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "CheckinLog_ticketId_idx" ON "CheckinLog"("ticketId");

-- CreateIndex
CREATE INDEX "CheckinLog_staffId_idx" ON "CheckinLog"("staffId");

-- CreateIndex
CREATE INDEX "GuestListEntry_concertId_idx" ON "GuestListEntry"("concertId");

-- CreateIndex
CREATE INDEX "GuestListEntry_email_idx" ON "GuestListEntry"("email");

-- CreateIndex
CREATE INDEX "UploadedFile_concertId_idx" ON "UploadedFile"("concertId");

-- CreateIndex
CREATE INDEX "UploadedFile_purpose_idx" ON "UploadedFile"("purpose");

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckinLog" ADD CONSTRAINT "CheckinLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckinLog" ADD CONSTRAINT "CheckinLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestListEntry" ADD CONSTRAINT "GuestListEntry_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
