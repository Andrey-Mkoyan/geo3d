'use client';

import { useApp } from '../../lib/AppContext';
import { CatalogView } from '../../components/CatalogView';

export default function CatalogPage() {
  const app = useApp();
  return (
    <CatalogView
      products={app.products}
      stock={app.stock}
      language={app.language}
      onOpenProductModal={app.setInspectingProduct}
      onAddToCart={app.addToCart}
    />
  );
}
