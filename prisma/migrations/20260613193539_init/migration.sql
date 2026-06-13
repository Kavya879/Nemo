-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "RoutingPath" AS ENUM ('RESELL_AS_IS', 'REFURBISH', 'PEER_TO_PEER', 'DONATE', 'RECYCLE');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('RETURNED', 'GRADED', 'ROUTED', 'LISTED', 'SOLD', 'DONATED', 'RECYCLED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'RESERVED', 'SOLD', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GradedBy" AS ENUM ('bedrock', 'local');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "currentGrade" "Grade",
    "status" "ItemStatus" NOT NULL DEFAULT 'RETURNED',
    "ownerHistory" JSONB NOT NULL DEFAULT '[]',
    "repairability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeResult" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "flaws" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL,
    "gradedBy" "GradedBy" NOT NULL,
    "tookMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingDecision" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "path" "RoutingPath" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "inputs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "pricePct" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "healthCard" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "wishlist" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GreenCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'demo-user',
    "itemId" TEXT,
    "action" "RoutingPath" NOT NULL,
    "credits" INTEGER NOT NULL,
    "co2SavedKg" DOUBLE PRECISION NOT NULL,
    "costSaved" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GreenCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "matchRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "peerToPeerMinBuyers" INTEGER NOT NULL DEFAULT 1,
    "repairabilityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "gradeDefaultRoutes" JSONB NOT NULL,
    "workingGrades" JSONB NOT NULL DEFAULT '["A","B","C"]',
    "priceBands" JSONB NOT NULL,
    "demandPriceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.05,
    "creditsPerAction" JSONB NOT NULL,
    "co2FactorsByCategory" JSONB NOT NULL,
    "co2DefaultKg" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "costSavedFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "preventionBaseConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");

-- CreateIndex
CREATE INDEX "Return_itemId_idx" ON "Return"("itemId");

-- CreateIndex
CREATE INDEX "GradeResult_itemId_idx" ON "GradeResult"("itemId");

-- CreateIndex
CREATE INDEX "RoutingDecision_itemId_idx" ON "RoutingDecision"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_itemId_key" ON "Listing"("itemId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "GreenCredit_userId_idx" ON "GreenCredit"("userId");

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeResult" ADD CONSTRAINT "GradeResult_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingDecision" ADD CONSTRAINT "RoutingDecision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenCredit" ADD CONSTRAINT "GreenCredit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
