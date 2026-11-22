-- Products get a photo gallery; "imageUrl" stays as the cover (first image).
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Product" SET "images" = ARRAY["imageUrl"] WHERE "imageUrl" <> '';
