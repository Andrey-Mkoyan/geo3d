import type { Metadata } from 'next';
import { AppProvider } from '../lib/AppContext';
import { AppShell } from '../components/AppShell';
import { db } from '../server/db';
import { getStaffOrNull } from '../server/auth';
import type { Category } from '../types';
import { toProductDTO } from '../server/dto';
import { getSettings } from '../server/services/settings.service';
import { getStockOptions } from '../server/services/inventory.service';
import './globals.css';

// Catalog, settings and session come from the database / cookies on every request
export const dynamic = 'force-dynamic';

const title = 'Geo3D — 3D Printing Service & Marketplace Georgia';
const description =
  '3D printing online store and custom manufacturing service in Georgia. Instant quote calculator, 3D file preview, express delivery in Tbilisi, Batumi, Kutaisi.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [products, categories, settings, staff, stock] = await Promise.all([
    db.product.findMany({ where: { published: true, categoryRef: { active: true } }, orderBy: { createdAt: 'asc' } }),
    db.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    getSettings(),
    getStaffOrNull(),
    getStockOptions(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased selection:bg-amber-500/20 selection:text-amber-900 dark:selection:text-amber-200">
        <AppProvider
          products={products.map(toProductDTO)}
          categories={categories.map((c) => ({ id: c.id, name: c.name as unknown as Category['name'], sortOrder: c.sortOrder, active: c.active }))} settings={settings} stock={stock} isStaff={!!staff}>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
