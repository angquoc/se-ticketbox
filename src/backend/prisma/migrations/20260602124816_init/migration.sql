/*
  Warnings:

  - The values [INITIATED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ISSUED] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `conflict` on the `CheckinLog` table. All the data in the column will be lost.
  - You are about to drop the column `isOffline` on the `CheckinLog` table. All the data in the column will be lost.
  - You are about to drop the column `coverImageUrl` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the column `organizerId` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the column `salesStartAt` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the column `seatMapUrl` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the column `qrPayload` on the `GuestListEntry` table. All the data in the column will be lost.
  - You are about to drop the column `sponsorName` on the `GuestListEntry` table. All the data in the column will be lost.
  - You are about to drop the column `concertId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `idempotencyKey` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `qrPayload` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `qrSignature` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `TicketType` table. All the data in the column will be lost.
  - You are about to drop the column `salesEndAt` on the `TicketType` table. All the data in the column will be lost.
  - You are about to drop the column `salesStartAt` on the `TicketType` table. All the data in the column will be lost.
  - You are about to drop the column `soldQty` on the `TicketType` table. All the data in the column will be lost.
  - You are about to drop the column `totalQty` on the `TicketType` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UploadedFile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[deviceId,offlineEventId]` on the table `CheckinLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentRef]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrTokenHash]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[concertId,code]` on the table `TicketType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `status` to the `CheckinLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Concert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saleEndsAt` to the `Concert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saleStartsAt` to the `Concert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GuestListEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountVnd` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotalVnd` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPriceVnd` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `concertId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qrTokenHash` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `TicketType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceVnd` to the `TicketType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuantity` to the `TicketType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TicketType` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ORGANIZER', 'CHECKIN_STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOMO', 'VNPAY', 'MOCK');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('SUCCESS', 'INVALID_TICKET', 'ALREADY_CHECKED_IN', 'OFFLINE_PENDING', 'REJECTED_CONFLICT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConcertStatus" ADD VALUE 'SALE_OPEN';
ALTER TYPE "ConcertStatus" ADD VALUE 'SALE_CLOSED';
ALTER TYPE "ConcertStatus" ADD VALUE 'COMPLETED';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED');
ALTER TABLE "public"."Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('ACTIVE', 'CHECKED_IN', 'CANCELLED', 'REFUNDED');
ALTER TABLE "public"."Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "public"."TicketStatus_old";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "CheckinLog" DROP CONSTRAINT "CheckinLog_staffId_fkey";

-- DropForeignKey
ALTER TABLE "CheckinLog" DROP CONSTRAINT "CheckinLog_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "Concert" DROP CONSTRAINT "Concert_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_concertId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "UploadedFile" DROP CONSTRAINT "UploadedFile_concertId_fkey";

-- DropIndex
DROP INDEX "CheckinLog_staffId_idx";

-- DropIndex
DROP INDEX "CheckinLog_ticketId_idx";

-- DropIndex
DROP INDEX "Order_concertId_status_idx";

-- DropIndex
DROP INDEX "Order_expiresAt_idx";

-- DropIndex
DROP INDEX "Order_userId_idempotencyKey_key";

-- DropIndex
DROP INDEX "Ticket_status_idx";

-- DropIndex
DROP INDEX "Ticket_ticketTypeId_idx";

-- DropIndex
DROP INDEX "TicketType_concertId_name_key";

-- AlterTable
ALTER TABLE "CheckinLog" DROP COLUMN "conflict",
DROP COLUMN "isOffline",
ADD COLUMN     "concertId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gate" TEXT,
ADD COLUMN     "offlineEventId" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "status" "CheckinStatus" NOT NULL,
ALTER COLUMN "ticketId" DROP NOT NULL,
ALTER COLUMN "staffId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Concert" DROP COLUMN "coverImageUrl",
DROP COLUMN "organizerId",
DROP COLUMN "salesStartAt",
DROP COLUMN "seatMapUrl",
DROP COLUMN "title",
ADD COLUMN     "artistName" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "saleEndsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "saleStartsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "seatMapSvgUrl" TEXT;

-- AlterTable
ALTER TABLE "GuestListEntry" DROP COLUMN "qrPayload",
DROP COLUMN "sponsorName",
ADD COLUMN     "company" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sourceFile" TEXT,
ADD COLUMN     "ticketLabel" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "concertId",
DROP COLUMN "idempotencyKey",
DROP COLUMN "totalAmount",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN     "paymentProvider" "PaymentProvider",
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "totalAmountVnd" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "unitPrice",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "subtotalVnd" INTEGER NOT NULL,
ADD COLUMN     "unitPriceVnd" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "qrPayload",
DROP COLUMN "qrSignature",
ADD COLUMN     "concertId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "orderItemId" TEXT,
ADD COLUMN     "qrTokenHash" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "TicketType" DROP COLUMN "price",
DROP COLUMN "salesEndAt",
DROP COLUMN "salesStartAt",
DROP COLUMN "soldQty",
DROP COLUMN "totalQty",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "priceVnd" INTEGER NOT NULL,
ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saleEndsAt" TIMESTAMP(3),
ADD COLUMN     "saleStartsAt" TIMESTAMP(3),
ADD COLUMN     "soldQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "TicketTypeStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "totalQuantity" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone",
ALTER COLUMN "passwordHash" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "UploadedFile";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "TicketReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerTransactionId" TEXT,
    "amountVnd" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "rawPayload" JSONB,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTicketCounter" (
    "userId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "paidQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTicketCounter_pkey" PRIMARY KEY ("userId","ticketTypeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketReservation_orderId_key" ON "TicketReservation"("orderId");

-- CreateIndex
CREATE INDEX "TicketReservation_status_expiresAt_idx" ON "TicketReservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "TicketReservation_userId_ticketTypeId_status_idx" ON "TicketReservation"("userId", "ticketTypeId", "status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_status_idx" ON "PaymentTransaction"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_provider_providerTransactionId_key" ON "PaymentTransaction"("provider", "providerTransactionId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_userId_key_key" ON "IdempotencyKey"("userId", "key");

-- CreateIndex
CREATE INDEX "CheckinLog_ticketId_scannedAt_idx" ON "CheckinLog"("ticketId", "scannedAt");

-- CreateIndex
CREATE INDEX "CheckinLog_staffId_scannedAt_idx" ON "CheckinLog"("staffId", "scannedAt");

-- CreateIndex
CREATE INDEX "CheckinLog_concertId_scannedAt_idx" ON "CheckinLog"("concertId", "scannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckinLog_deviceId_offlineEventId_key" ON "CheckinLog"("deviceId", "offlineEventId");

-- CreateIndex
CREATE INDEX "Concert_status_startsAt_idx" ON "Concert"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Concert_saleStartsAt_saleEndsAt_idx" ON "Concert"("saleStartsAt", "saleEndsAt");

-- CreateIndex
CREATE INDEX "GuestListEntry_phone_idx" ON "GuestListEntry"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentRef_key" ON "Order"("paymentRef");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_ticketTypeId_idx" ON "OrderItem"("ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrTokenHash_key" ON "Ticket"("qrTokenHash");

-- CreateIndex
CREATE INDEX "Ticket_userId_status_idx" ON "Ticket"("userId", "status");

-- CreateIndex
CREATE INDEX "Ticket_concertId_status_idx" ON "Ticket"("concertId", "status");

-- CreateIndex
CREATE INDEX "Ticket_ticketTypeId_status_idx" ON "Ticket"("ticketTypeId", "status");

-- CreateIndex
CREATE INDEX "TicketType_concertId_status_idx" ON "TicketType"("concertId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TicketType_concertId_code_key" ON "TicketType"("concertId", "code");

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReservation" ADD CONSTRAINT "TicketReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReservation" ADD CONSTRAINT "TicketReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReservation" ADD CONSTRAINT "TicketReservation_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTicketCounter" ADD CONSTRAINT "UserTicketCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTicketCounter" ADD CONSTRAINT "UserTicketCounter_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckinLog" ADD CONSTRAINT "CheckinLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckinLog" ADD CONSTRAINT "CheckinLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckinLog" ADD CONSTRAINT "CheckinLog_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
