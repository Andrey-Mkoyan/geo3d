'use client';

import React, { useEffect } from 'react';
import { CartItem, Language } from '../types';
import { translations } from '../i18n/translations';
import { shellText } from '../i18n/shell';
import { X, Trash2, ArrowRight, ShoppingBag, Plus, Minus, Box } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToCheckout: () => void;
  language: Language;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  language,
}) => {
  const t = translations[language];
  const s = shellText[language];

  // Esc closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.totalPriceGel, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="w-screen max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col text-neutral-900 dark:text-neutral-100">
          {/* Drawer Header */}
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold">{t.cartTitle}</h2>
              <span className="text-xs text-neutral-500 font-mono">({items.length})</span>
            </div>
            <button
              onClick={onClose}
              aria-label={s.close}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="py-20 text-center text-neutral-500">
                <Box className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-sm font-semibold">{t.cartEmpty}</p>
                <p className="text-xs mt-1 text-neutral-400">
                  {s.cartEmptyHint}
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 flex gap-3 items-start"
                >
                  {/* Thumbnail / 3D Icon */}
                  <div className="w-16 h-16 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        <Box className="w-6 h-6 mb-0.5" />
                        <span>3D STL</span>
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.cartItemId)}
                        aria-label={s.removeItem}
                        className="text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {item.subtitle}
                    </p>

                    {item.requiresReview && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {s.requiresReview}
                      </span>
                    )}

                    {/* Quantity & Price Row */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
                      <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-800">
                        <button
                          onClick={() => onUpdateQuantity(item.cartItemId, item.config.quantity - 1)}
                          aria-label={s.decreaseQty}
                          className="px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono font-bold">
                          {item.config.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.cartItemId, item.config.quantity + 1)}
                          aria-label={s.increaseQty}
                          className="px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
                          {item.totalPriceGel.toFixed(2)} ₾
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer with Subtotal & Checkout Button */}
          {items.length > 0 && (
            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">{t.subtotal}</span>
                <span className="font-extrabold font-mono text-base tabular-nums">
                  {subtotal.toFixed(2)} ₾
                </span>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.checkoutBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
