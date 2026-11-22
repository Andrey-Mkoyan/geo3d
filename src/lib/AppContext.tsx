'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Category, Language, Product, CartItem, PublicSettings, StockOption } from '../types';

/**
 * UI state only. Business data (orders, printers, ...) lives in the database and is
 * fetched from /api; products and public settings are loaded on the server and passed in.
 */
interface AppState {
  language: Language;
  setLanguage: (l: Language) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isStaff: boolean;
  products: Product[];
  categories: Category[];
  settings: PublicSettings;
  stock: StockOption[];
  cartItems: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (v: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (v: boolean) => void;
  inspectingProduct: Product | null;
  setInspectingProduct: (p: Product | null) => void;
  addToCart: (item: CartItem) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const CART_KEY = 'geo3d-cart-v1';

export function AppProvider({
  children,
  products,
  categories,
  settings,
  stock,
  isStaff,
}: {
  children: React.ReactNode;
  products: Product[];
  categories: Category[];
  settings: PublicSettings;
  stock: StockOption[];
  isStaff: boolean;
}) {
  // Georgian is the default language per the specification
  const [language, setLanguage] = useState<Language>('ka');
  const [darkMode, setDarkMode] = useState(false);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);

  // Read browser-only state after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) setCartItems(JSON.parse(saved));
    } catch {
      /* ignore corrupt cart */
    }
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    } catch {
      /* storage full / unavailable */
    }
  }, [cartItems, cartLoaded]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const removeCartItem = useCallback(
    (id: string) => setCartItems((prev) => prev.filter((i) => i.cartItemId !== id)),
    []
  );

  const addToCart = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex(
        (i) =>
          i.type === 'catalog_product' &&
          i.productId === item.productId &&
          i.config.material === item.config.material &&
          i.config.colorHex === item.config.colorHex
      );
      if (idx >= 0) {
        const updated = [...prev];
        const existing = updated[idx];
        const newQty = existing.config.quantity + item.config.quantity;
        updated[idx] = {
          ...existing,
          config: { ...existing.config, quantity: newQty },
          totalPriceGel: existing.unitPriceGel * newQty,
        };
        return updated;
      }
      return [...prev, item];
    });
  }, []);

  const updateQuantity = useCallback(
    (id: string, qty: number) => {
      if (qty <= 0) return removeCartItem(id);
      setCartItems((prev) =>
        prev.map((i) =>
          i.cartItemId === id
            ? {
                ...i,
                config: { ...i.config, quantity: qty },
                totalPriceGel: Math.round(i.unitPriceGel * qty * 10) / 10,
              }
            : i
        )
      );
    },
    [removeCartItem]
  );

  const clearCart = useCallback(() => setCartItems([]), []);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        darkMode,
        toggleDarkMode: () => setDarkMode((d) => !d),
        isStaff,
        products,
        categories,
        settings,
        stock,
        cartItems,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        inspectingProduct,
        setInspectingProduct,
        addToCart,
        updateQuantity,
        removeCartItem,
        clearCart,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
