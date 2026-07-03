-- AlterEnum
ALTER TYPE "CheckinStatus" ADD VALUE 'GATE_MISMATCH';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "gateId" TEXT;

-- CreateTable
CREATE TABLE "Gate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gate_concertId_name_key" ON "Gate"("concertId", "name");

-- AddForeignKey
ALTER TABLE "Gate" ADD CONSTRAINT "Gate_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
