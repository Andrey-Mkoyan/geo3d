'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Language } from '../types';
import { catalogText } from '../i18n/catalog';
import { fmt } from '../i18n/payment';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  heightClass?: string;
  language?: Language;
}

/** Main photo with arrows + a thumbnail strip underneath, and a full-screen lightbox. */
export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, alt, heightClass = 'h-[380px]', language = 'en' }) => {
  const c = catalogText[language];
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const count = images.length;
  const current = Math.min(index, Math.max(count - 1, 0));
  const go = useCallback((delta: number) => setIndex((i) => (count ? (i + delta + count) % count : 0)), [count]);

  // Back to the first photo when another product is opened
  const key = images.join('|');
  useEffect(() => setIndex(0), [key]);

  // Keyboard: arrows while the lightbox is open, Esc closes it
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation(); // close only the lightbox, not the product window behind it
        setLightbox(false);
      }
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [lightbox, go]);

  // Keep the active thumbnail in view
  useEffect(() => {
    const el = stripRef.current?.children[current] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [current]);

  if (!count) return null;

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-neutral-950/55 hover:bg-neutral-950/80 text-white backdrop-blur-sm transition-colors cursor-pointer';

  return (
    <div>
      <div
        className={`relative ${heightClass} rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 group`}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        <button type="button" onClick={() => setLightbox(true)} className="w-full h-full cursor-zoom-in" aria-label={c.openPhoto}>
          <img src={images[current]} alt={alt} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </button>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${arrow} left-2`} aria-label={c.prevPhoto}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => go(1)} className={`${arrow} right-2`} aria-label={c.nextPhoto}>
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-neutral-950/60 text-white text-[11px] font-mono pointer-events-none">
              {current + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div ref={stripRef} className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={fmt(c.photoN, { n: String(i + 1) })}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                i === current ? 'border-amber-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[70] bg-neutral-950/92 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button type="button" onClick={() => setLightbox(false)} className={`${arrow} !top-4 !translate-y-0 right-4`} aria-label={c.close}>
            <X className="w-5 h-5" />
          </button>
          {count > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className={`${arrow} left-4`}
              aria-label={c.prevPhoto}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <img
            src={images[current]}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
          {count > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className={`${arrow} right-4`}
              aria-label={c.nextPhoto}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
