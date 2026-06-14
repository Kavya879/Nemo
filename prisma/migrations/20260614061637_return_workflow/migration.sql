-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('INITIATED', 'GRADED', 'FEASIBILITY_ANALYZED', 'RETURN_APPROVED', 'RETURN_PICKUP_SCHEDULED', 'RETURNED_TO_SELLER', 'SECOND_LIFE_LISTED', 'BUYER_RESERVED', 'SL_PICKUP_SCHEDULED', 'DELIVERY_VERIFICATION', 'TRANSFER_APPROVED', 'REFUND_INITIATED', 'COMPLETED', 'TRANSFER_REJECTED', 'WINDOW_EXPIRED', 'LIQUIDATION_PICKUP', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "ReturnDecision" AS ENUM ('FEASIBLE', 'NOT_FEASIBLE');

-- CreateEnum
CREATE TYPE "Disposition" AS ENUM ('LIQUIDATED', 'BULK_RESALE', 'REFURBISHMENT', 'RECYCLED', 'DONATED');

-- AlterTable
ALTER TABLE "RoutingConfig" ADD COLUMN     "depreciationByGrade" JSONB,
ADD COLUMN     "estimatedStorageDays" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "feasibilityRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.15,
ADD COLUMN     "inspectionCost" DOUBLE PRECISION NOT NULL DEFAULT 35,
ADD COLUMN     "minNetRecoveryValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pickupBaseCost" DOUBLE PRECISION NOT NULL DEFAULT 80,
ADD COLUMN     "repackagingBaseCost" DOUBLE PRECISION NOT NULL DEFAULT 25,
ADD COLUMN     "secondLifeWindowDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "storageCostPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
ADD COLUMN     "transportCostPerKm" DOUBLE PRECISION NOT NULL DEFAULT 3,
ADD COLUMN     "warehouseHandlingCost" DOUBLE PRECISION NOT NULL DEFAULT 40,
ADD COLUMN     "warehouseLat" DOUBLE PRECISION NOT NULL DEFAULT 11.0168,
ADD COLUMN     "warehouseLng" DOUBLE PRECISION NOT NULL DEFAULT 76.9558;

-- CreateTable
CREATE TABLE "ReturnCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'demo-user',
    "itemId" TEXT NOT NULL,
    "orderId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'INITIATED',
    "decision" "ReturnDecision",
    "gradeResultId" TEXT,
    "grade" "Grade",
    "feasibility" JSONB,
    "secondLifeListingId" TEXT,
    "secondLifeDeadline" TIMESTAMP(3),
    "reservedBuyerId" TEXT,
    "reservedBuyerName" TEXT,
    "reservedDistanceKm" DOUBLE PRECISION,
    "verificationApproved" BOOLEAN,
    "verificationNotes" TEXT,
    "rejectionReason" TEXT,
    "disposition" "Disposition",
    "refundInitiatedAt" TIMESTAMP(3),
    "refundAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnEvent" (
    "id" TEXT NOT NULL,
    "returnCaseId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnCase_userId_idx" ON "ReturnCase"("userId");

-- CreateIndex
CREATE INDEX "ReturnCase_status_idx" ON "ReturnCase"("status");

-- CreateIndex
CREATE INDEX "ReturnCase_itemId_idx" ON "ReturnCase"("itemId");

-- CreateIndex
CREATE INDEX "ReturnEvent_returnCaseId_idx" ON "ReturnEvent"("returnCaseId");

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvent" ADD CONSTRAINT "ReturnEvent_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
