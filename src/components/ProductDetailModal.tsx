'use client';

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Product, Language, CartItem, PrintMaterialType, StockOption } from '../types';
import { colorLabel, colorsInStock, materialsInStock, stockText } from '../lib/stock';
import { useApp } from '../lib/AppContext';
import { ProductGallery } from './ProductGallery';
import { translations } from '../i18n/translations';
import { catalogText } from '../i18n/catalog';
import { fmt } from '../i18n/payment';
import { X, Check, ShoppingBag, Box, Clock, ShieldCheck, Scale, Sparkles } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  stock: StockOption[];
  language: Language;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  stock,
  language,
  onClose,
  onAddToCart,
}) => {
  const t = translations[language];
  const c = catalogText[language];
  const { categories } = useApp();

  // Config state for the product
  // Options come from the warehouse: what the customer picks is stored here,
  // the effective selection is derived below so it is always something that is in stock.
  const [chosenMaterial, setChosenMaterial] = useState<PrintMaterialType | null>(null);
  const [chosenHex, setChosenHex] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  // Start fresh whenever a different product is opened
  useEffect(() => {
    setChosenMaterial(null);
    setChosenHex(null);
    setQuantity(1);
  }, [product?.id]);

  // Esc closes
  useEffect(() => {
    if (!!!product) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [!!product, onClose]);

  if (!product) return null;

  const stockMaterials = materialsInStock(stock, product.materials);
  const selectedMaterial: PrintMaterialType =
    chosenMaterial && stockMaterials.includes(chosenMaterial) ? chosenMaterial : stockMaterials[0] ?? product.materials[0];
  const stockColors = colorsInStock(stock, stockMaterials.length ? selectedMaterial : undefined);
  const selectedStock = stockColors.find((c) => c.hex === chosenHex) ?? stockColors[0];
  const selectedColor = selectedStock
    ? { hex: selectedStock.hex, label: colorLabel(selectedStock, language, product) }
    : { hex: '#888888', label: '-' };
  const canOrder = stockMaterials.length > 0 && !!selectedStock;

  const unitPrice = product.priceGel;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    if (!canOrder) return;
    const item: CartItem = {
      cartItemId: `prod-${product.id}-${Date.now()}`,
      type: 'catalog_product',
      productId: product.id,
      title: product.title[language],
      subtitle: `${selectedMaterial} · ${selectedColor.label} · ${fmt(c.pcsN, { n: String(quantity) })}`,
      imageUrl: product.imageUrl,
      geometry: {
        fileName: `${product.id}.stl`,
        fileSizeFormatted: '3.2 MB',
        fileSizeBytes: 3355443,
        triangles: 0,
        bounds: product.dimensionsMm,
        volumeCm3: Math.round(product.weightGrams / 1.25),
        estimatedGrams: product.weightGrams,
        isOverBedSize: false,
      },
      config: {
        material: selectedMaterial,
        colorName: selectedColor.label,
        colorHex: selectedColor.hex,
        layerHeight: 0.16,
        infillPercent: 25,
        scalePercent: 100,
        quantity,
      },
      unitPriceGel: unitPrice,
      totalPriceGel: totalPrice,
      requiresReview: false,
    };

    onAddToCart(item);
    setIsAddedFeedback(true);
    setTimeout(() => {
      setIsAddedFeedback(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl text-neutral-900 dark:text-neutral-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={c.close}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8 items-start">
          {/* Left Column: product photo */}
          <div>
            <ProductGallery
              images={product.images?.length ? product.images : [product.imageUrl]}
              alt={product.title[language]}
              language={language}
            />

            {/* Dimension Specifications Callout */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-mono text-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="text-neutral-400 text-[10px] block">{c.dimensions}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {product.dimensionsMm.x}×{product.dimensionsMm.y}×{product.dimensionsMm.z}{c.mm}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">{c.weight}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  ~{product.weightGrams}g
                </span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">{c.leadTime}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {product.leadTimeHours} {t.hours}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Contiguous Purchase Module */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <span>{categories.find((c) => c.id === product.category)?.name[language] ?? product.category}</span>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">·</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {product.inStock ? t.readyToShip : t.printOnDemand}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
                {product.title[language]}
              </h2>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-2 tabular-nums">
                {totalPrice} ₾
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {product.description[language]}
            </p>

            {/* Material Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                {t.materialType}
              </label>
              <div className="flex flex-wrap gap-2">
                {stockMaterials.length === 0 && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{stockText[language].noMaterial}</span>
                )}
                {stockMaterials.map((mat) => (
                  <button
                    key={mat}
                    onClick={() => {
                      setChosenMaterial(mat);
                      setChosenHex(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      selectedMaterial === mat
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                {t.colorSelect}: <span className="font-normal text-neutral-500">{selectedColor.label}</span>
              </label>
              <div className="flex items-center gap-3">
                {stockColors.map((col) => (
                  <button
                    key={col.hex}
                    onClick={() => setChosenHex(col.hex)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                      selectedColor.hex === col.hex
                        ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-neutral-900 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={colorLabel(col, language, product)}
                  >
                    {selectedColor.hex === col.hex && (
                      <Check className={`w-3.5 h-3.5 ${col.hex === '#f0ede6' || col.hex === '#f4f4f5' ? 'text-black' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {t.quantityLabel}
              </label>
              <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden w-36 bg-neutral-50 dark:bg-neutral-800">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono font-bold text-xs">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Trust Assurance */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>{c.precisionFit}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>{fmt(c.readyIn, { h: String(product.leadTimeHours) })}</span>
              </div>
            </div>

            {/* Add to Cart CTA */}
            <button
              onClick={handleAdd}
              disabled={!canOrder}
              className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isAddedFeedback
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
              }`}
            >
              {isAddedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{c.added}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>{canOrder ? `${t.addToCart} — ${totalPrice} ₾` : stockText[language].outOfStock}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
