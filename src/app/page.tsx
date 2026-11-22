'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '../lib/AppContext';
import { Hero } from '../components/Hero';
import { CustomPrintCalculator } from '../components/CustomPrintCalculator';
import { CatalogView } from '../components/CatalogView';
import { MaterialsGuideView } from '../components/MaterialsGuideView';

export default function HomePage() {
  const app = useApp();
  const router = useRouter();
  return (
    <>
      <Hero
        language={app.language}
        onNavigateToCatalog={() => router.push('/catalog')}
        onNavigateToUpload={() => router.push('/custom-print')}
      />
      <CustomPrintCalculator language={app.language} stock={app.stock} onAddToCart={app.addToCart} />
      <CatalogView
        products={app.products}
        stock={app.stock}
        language={app.language}
        onOpenProductModal={app.setInspectingProduct}
        onAddToCart={app.addToCart}
      />
      <MaterialsGuideView
        language={app.language}
        onSelectMaterialForUpload={() => router.push('/custom-print')}
      />
    </>
  );
}
