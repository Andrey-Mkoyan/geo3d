-- Simplify order statuses: drop in_queue / post_processing / quality_control, add awaiting_courier after ready.
CREATE TYPE "OrderStatus_new" AS ENUM ('awaiting_payment', 'awaiting_review', 'confirmed', 'preparation', 'printing', 'ready', 'awaiting_courier', 'shipped', 'cancelled');

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE "status"::text
    WHEN 'in_queue' THEN 'printing'
    WHEN 'post_processing' THEN 'printing'
    WHEN 'quality_control' THEN 'ready'
    ELSE "status"::text
  END::"OrderStatus_new");

ALTER TABLE "OrderEvent" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE "status"::text
    WHEN 'in_queue' THEN 'printing'
    WHEN 'post_processing' THEN 'printing'
    WHEN 'quality_control' THEN 'ready'
    ELSE "status"::text
  END::"OrderStatus_new");

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'awaiting_payment';
