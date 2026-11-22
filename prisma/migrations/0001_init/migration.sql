-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('awaiting_payment', 'awaiting_review', 'confirmed', 'preparation', 'in_queue', 'printing', 'post_processing', 'quality_control', 'ready', 'shipped', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('awaiting_quote', 'awaiting_payment', 'proof_submitted', 'verified', 'rejected', 'refunded');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'STALE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('tbilisi_courier', 'regional_courier', 'self_pickup');

-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ka', 'en', 'ru');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('catalog_product', 'custom_file');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('admin', 'operator_orders', 'operator_prod');

-- CreateEnum
CREATE TYPE "PrinterStatus" AS ENUM ('idle', 'printing', 'maintenance', 'offline');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'operator_orders',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "priceGel" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "dimensionsMm" JSONB NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "materials" TEXT[],
    "colors" JSONB NOT NULL,
    "leadTimeHours" INTEGER NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "presetModel" TEXT,
    "modelRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "trackingTokenHash" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'ka',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "preferredContact" "ContactPreference" NOT NULL DEFAULT 'EMAIL',
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "city" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "subtotalGel" DECIMAL(10,2) NOT NULL,
    "deliveryGel" DECIMAL(10,2) NOT NULL,
    "discountGel" DECIMAL(10,2) NOT NULL,
    "totalGel" DECIMAL(10,2) NOT NULL,
    "promoCode" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'awaiting_payment',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'awaiting_payment',
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "estimatedCompletion" TIMESTAMP(3),
    "assignedPrinterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "productId" TEXT,
    "modelRef" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "imageUrl" TEXT,
    "material" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "layerHeight" DOUBLE PRECISION NOT NULL,
    "infillPercent" INTEGER NOT NULL,
    "scalePercent" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "options" JSONB,
    "geometry" JSONB,
    "unitPriceGel" DECIMAL(10,2) NOT NULL,
    "totalPriceGel" DECIMAL(10,2) NOT NULL,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus",
    "paymentStatus" "PaymentStatus",
    "note" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "thumbKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "amountClaimedGel" DECIMAL(10,2),
    "payerName" TEXT,
    "bankName" TEXT,
    "transferDate" TIMESTAMP(3),
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "buildVolumeMm" JSONB NOT NULL,
    "supportedMaterials" TEXT[],
    "status" "PrinterStatus" NOT NULL DEFAULT 'idle',
    "currentOrderId" TEXT,
    "currentProgressPercent" INTEGER,
    "timeRemainingMinutes" INTEGER,
    "totalPrintHours" INTEGER NOT NULL DEFAULT 0,
    "lastMaintenanceDate" TEXT NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSpool" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "diameterMm" DOUBLE PRECISION NOT NULL,
    "totalWeightGrams" INTEGER NOT NULL,
    "remainingGrams" INTEGER NOT NULL,
    "purchaseCostGel" DECIMAL(10,2) NOT NULL,
    "minThresholdGrams" INTEGER NOT NULL,
    "location" TEXT NOT NULL,

    CONSTRAINT "MaterialSpool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingTokenHash_key" ON "Order"("trackingTokenHash");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");

-- CreateIndex
CREATE INDEX "PaymentProof_orderId_idx" ON "PaymentProof"("orderId");

-- CreateIndex
CREATE INDEX "PaymentProof_sha256_idx" ON "PaymentProof"("sha256");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedPrinterId_fkey" FOREIGN KEY ("assignedPrinterId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Order numbers: GEO-1001, GEO-1002, ...
CREATE SEQUENCE "order_number_seq" START 1001;
