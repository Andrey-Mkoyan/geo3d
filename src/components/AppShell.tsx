'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '../lib/AppContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { ProductDetailModal } from './ProductDetailModal';
import { CartDrawer } from './CartDrawer';
import { CheckoutModal } from './CheckoutModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = pathname === '/' ? 'home' : pathname.split('/')[1];
  const navigate = (tab: string) => router.push(tab === 'home' ? '/' : `/${tab}`);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <Header
        currentTab={currentTab}
        onTabChange={navigate}
        language={app.language}
        onLanguageChange={app.setLanguage}
        darkMode={app.darkMode}
        onToggleDarkMode={app.toggleDarkMode}
        cartCount={app.cartItems.reduce((s, i) => s + i.config.quantity, 0)}
        onOpenCart={() => app.setIsCartOpen(true)}
        isStaff={app.isStaff}
      />

      <main className="flex-1">{children}</main>

      <ProductDetailModal
        product={app.inspectingProduct}
        stock={app.stock}
        language={app.language}
        onClose={() => app.setInspectingProduct(null)}
        onAddToCart={app.addToCart}
      />
      <CartDrawer
        isOpen={app.isCartOpen}
        onClose={() => app.setIsCartOpen(false)}
        items={app.cartItems}
        onUpdateQuantity={app.updateQuantity}
        onRemoveItem={app.removeCartItem}
        onProceedToCheckout={() => app.setIsCheckoutOpen(true)}
        language={app.language}
      />
      <CheckoutModal
        isOpen={app.isCheckoutOpen}
        onClose={() => app.setIsCheckoutOpen(false)}
        items={app.cartItems}
        language={app.language}
        settings={app.settings}
        onOrderCreated={() => app.clearCart()}
        onTrack={(token) => {
          app.setIsCheckoutOpen(false);
          router.push(`/track/${token}`);
        }}
      />

      <Footer language={app.language} onNavigate={navigate} />
    </div>
  );
}
