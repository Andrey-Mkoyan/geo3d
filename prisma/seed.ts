import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { INITIAL_PRODUCTS, INITIAL_PRINTERS, INITIAL_SPOOLS } from '../src/data/initialData';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const json = (v: unknown) => v as object;

async function main() {
  // Catalog
  for (const p of INITIAL_PRODUCTS) {
    const data = {
      slug: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      priceGel: p.priceGel,
      imageUrl: p.imageUrl,
      images: [p.imageUrl],
      dimensionsMm: json(p.dimensionsMm),
      weightGrams: p.weightGrams,
      materials: p.materials,
      colors: p.availableColors,
      leadTimeHours: p.leadTimeHours,
      inStock: p.inStock,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      featured: !!p.featured,
      tags: p.tags,
      presetModel: p.presetModelType ?? null,
    };
    await prisma.product.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: {} });
  }

  // Workshop fleet & inventory
  for (const pr of INITIAL_PRINTERS) {
    const { currentOrderId: _drop, ...r } = pr; // demo order ids don't exist in the real DB
    const rest = { ...r, buildVolumeMm: json(r.buildVolumeMm) };
    await prisma.printer.upsert({ where: { id: pr.id }, create: rest, update: rest });
  }
  for (const s of INITIAL_SPOOLS) {
    await prisma.materialSpool.upsert({ where: { id: s.id }, create: s, update: s });
  }

  // Promo code (was hardcoded in the checkout UI)
  await prisma.promoCode.upsert({
    where: { code: 'GEO3D' },
    create: { code: 'GEO3D', percentOff: 10 },
    update: {},
  });

  // Public settings (edit these rows later via admin / SQL). Replace the placeholder IBANs!
  const settings: Record<string, unknown> = {
    bankAccounts: [
      { bank: 'Bank of Georgia', iban: 'GE00BG0000000000000000', recipient: 'Geo3D LLC' },
      { bank: 'TBC Bank', iban: 'GE00TB0000000000000000', recipient: 'Geo3D LLC' },
    ],
    deliveryFees: { tbilisi_courier: 10, regional_courier: 15, self_pickup: 0 },
    pickupAddress: 'Technopark Vake, Chavchavadze 37',
  };
  for (const [key, value] of Object.entries(settings)) {
    // `update: {}` so re-seeding never overwrites values edited in production
    await prisma.setting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });
  }

  // First admin
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@geo3d.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: 'Workshop Admin', role: 'admin', passwordHash: await bcrypt.hash(password, 12) },
    update: {},
  });

  console.log(`Seeded ${INITIAL_PRODUCTS.length} products, ${INITIAL_PRINTERS.length} printers, ${INITIAL_SPOOLS.length} spools.`);
  console.log(`Admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
