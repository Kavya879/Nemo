-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CONSUMER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('APPAREL', 'FOOTWEAR', 'ELECTRONICS', 'HOME', 'TOYS', 'BOOKS', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'RETURNED', 'GRADED', 'ROUTED', 'LISTED', 'SOLD', 'DONATED', 'LIQUIDATED', 'EXCHANGED', 'REFURBISHED');

-- CreateEnum
CREATE TYPE "ReturnRoute" AS ENUM ('RESALE', 'REFURBISH', 'DONATE', 'LIQUIDATE', 'PEER_EXCHANGE');

-- CreateEnum
CREATE TYPE "ConditionGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'LISTED', 'SOLD', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "GreenCreditAction" AS ENUM ('ROUTE_AWARD', 'BONUS_QUALITY', 'BONUS_SPEED', 'BONUS_REPEAT', 'BONUS_LOCAL', 'ADMIN_REVOKE', 'ADMIN_REISSUE');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'GRADED', 'ROUTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CONSUMER',
    "region" TEXT NOT NULL,
    "greenCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "category" "ProductCategory" NOT NULL,
    "sku" TEXT,
    "originalPrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "condition" "ConditionGrade",
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "serialHash" TEXT,
    "materialNotes" TEXT[],
    "ownerCount" INTEGER NOT NULL DEFAULT 1,
    "cityTrail" TEXT[],
    "carbonSaved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "region" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "returnId" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "qualityScore" INTEGER,
    "isClear" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInspection" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "severeTerms" TEXT[],
    "mildTerms" TEXT[],
    "unusedTerms" TEXT[],
    "laplacianVar" DOUBLE PRECISION,
    "brightnessMean" DOUBLE PRECISION,
    "edgeDensity" DOUBLE PRECISION,
    "isClear" BOOLEAN NOT NULL DEFAULT false,
    "yoloDefects" INTEGER NOT NULL DEFAULT 0,
    "yoloLabels" TEXT[],
    "reasoning" TEXT,
    "reasoningSource" TEXT NOT NULL DEFAULT 'template',
    "servicesUsed" TEXT[],
    "fallbackMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCard" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "conditionScore" INTEGER NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "historyScore" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "grade" "ConditionGrade" NOT NULL,
    "routeReason" TEXT NOT NULL,
    "nextAction" TEXT NOT NULL,
    "riskFlags" TEXT[],
    "greenCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingDecision" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "route" "ReturnRoute" NOT NULL,
    "priority" INTEGER NOT NULL,
    "conditionMet" TEXT NOT NULL,
    "overriddenBy" TEXT,
    "previousRoute" "ReturnRoute",
    "overrideReason" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResaleListing" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "priceConfidence" INTEGER,
    "grade" "ConditionGrade" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "buyerRegion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResaleListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerMatch" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "pool" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "size" TEXT,
    "urgency" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "demandLevel" TEXT NOT NULL,
    "distanceScore" DOUBLE PRECISION NOT NULL,
    "urgencyScore" DOUBLE PRECISION NOT NULL,
    "sizeScore" DOUBLE PRECISION NOT NULL,
    "demandScore" DOUBLE PRECISION NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "matchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerListingAudit" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingTitle" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "originalDesc" TEXT NOT NULL,
    "returnReasons" TEXT[],
    "returnCount" INTEGER NOT NULL DEFAULT 0,
    "detectedIssue" TEXT,
    "revisedTitle" TEXT,
    "revisedDesc" TEXT,
    "preventionTip" TEXT,
    "rewriteStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerListingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "usualSize" TEXT NOT NULL,
    "preferredFit" TEXT,
    "footWidth" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandFitRule" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "sizeAdjustment" INTEGER NOT NULL DEFAULT 0,
    "fitType" TEXT NOT NULL DEFAULT 'regular',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "recommendation" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandFitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GreenCreditLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "returnId" TEXT,
    "action" "GreenCreditAction" NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GreenCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "city" TEXT,
    "carbonDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProductItem_serialHash_key" ON "ProductItem"("serialHash");

-- CreateIndex
CREATE UNIQUE INDEX "AIInspection_returnId_key" ON "AIInspection"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthCard_returnId_key" ON "HealthCard"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingDecision_returnId_key" ON "RoutingDecision"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "SizeProfile_userId_category_key" ON "SizeProfile"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "BrandFitRule_brand_category_key" ON "BrandFitRule"("brand", "category");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductItem" ADD CONSTRAINT "ProductItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInspection" ADD CONSTRAINT "AIInspection_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInspection" ADD CONSTRAINT "AIInspection_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCard" ADD CONSTRAINT "HealthCard_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCard" ADD CONSTRAINT "HealthCard_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingDecision" ADD CONSTRAINT "RoutingDecision_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingDecision" ADD CONSTRAINT "RoutingDecision_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleListing" ADD CONSTRAINT "ResaleListing_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleListing" ADD CONSTRAINT "ResaleListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerMatch" ADD CONSTRAINT "PeerMatch_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerMatch" ADD CONSTRAINT "PeerMatch_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerListingAudit" ADD CONSTRAINT "SellerListingAudit_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeProfile" ADD CONSTRAINT "SizeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenCreditLedger" ADD CONSTRAINT "GreenCreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenCreditLedger" ADD CONSTRAINT "GreenCreditLedger_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
