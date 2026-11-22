-- Categories become a managed table; products link to a model page instead of a file key.
CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" JSONB NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Category" ("id", "name", "sortOrder") VALUES
  ('home', '{"ka":"სახლი და ინტერიერი","en":"Home & Interior","ru":"Дом и интерьер"}', 1),
  ('accessories', '{"ka":"აქსესუარები","en":"Desk & Accessories","ru":"Аксессуары"}', 2),
  ('organization', '{"ka":"ორგანიზება","en":"Organization","ru":"Организация пространства"}', 3),
  ('hobby', '{"ka":"ჰობი და მინიატურები","en":"Hobby & Miniatures","ru":"Хобби и миниатюры"}', 4),
  ('parts', '{"ka":"სათადარიგო დეტალები","en":"Spare Parts & Mounts","ru":"Запчасти и крепления"}', 5),
  ('prototyping', '{"ka":"პროტოტიპირება","en":"Rapid Prototyping","ru":"Прототипирование"}', 6);

-- any category value already used by a product must exist
INSERT INTO "Category" ("id", "name", "sortOrder")
  SELECT DISTINCT p."category", jsonb_build_object('ka', p."category", 'en', p."category", 'ru', p."category"), 99
  FROM "Product" p WHERE p."category" NOT IN (SELECT "id" FROM "Category");

ALTER TABLE "Product" RENAME COLUMN "modelRef" TO "modelUrl";
ALTER TABLE "Product" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
