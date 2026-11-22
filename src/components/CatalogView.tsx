'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Product, Language, CartItem, PrintMaterialType, StockOption } from '../types';
import { colorLabel, defaultOptionFor, stockText } from '../lib/stock';
import { useApp } from '../lib/AppContext';
import { translations } from '../i18n/translations';
import { catalogText } from '../i18n/catalog';
import { fmt } from '../i18n/payment';
import { Search, Filter, Box, ShoppingBag, Eye, SlidersHorizontal, Check, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface CatalogViewProps {
  products: Product[];
  stock: StockOption[];
  language: Language;
  onOpenProductModal: (product: Product) => void;
  onAddToCart: (item: CartItem) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  stock,
  language,
  onOpenProductModal,
  onAddToCart,
}) => {
  const t = translations[language];
  const c = catalogText[language];
  const { categories: shopCategories } = useApp();
  const categoryName = (id: string) => shopCategories.find((c) => c.id === id)?.name[language] ?? id;

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');
  const [addedId, setAddedId] = useState<string | null>(null);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: 'all', label: t.filterAll },
    ...shopCategories.map((c) => ({ id: c.id, label: c.name[language] })),
  ];

  const scrollCategories = (offset: number) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (selectedMaterial !== 'all' && !p.materials.includes(selectedMaterial as PrintMaterialType))
          return false;
        if (p.priceGel > maxPrice) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title[language].toLowerCase().includes(q);
          const matchDesc = p.description[language].toLowerCase().includes(q);
          const matchTags = p.tags.some((tag) => tag.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price_asc') return a.priceGel - b.priceGel;
        if (sortOption === 'price_desc') return b.priceGel - a.priceGel;
        // Popular: featured products first, then by rating x reviews
        if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
        return (b.rating * b.reviewsCount) - (a.rating * a.reviewsCount);
      });
  }, [products, selectedCategory, selectedMaterial, maxPrice, searchQuery, sortOption, language]);

  const handleQuickAdd = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const option = defaultOptionFor(stock, p);
    if (!option) return; // nothing in stock for this product
    const defaultMaterial = option.material;
    const defaultColor = { hex: option.color.hex, name: { [language]: colorLabel(option.color, language, p) } as Record<Language, string> };

    const item: CartItem = {
      cartItemId: `prod-${p.id}-${Date.now()}`,
      type: 'catalog_product',
      productId: p.id,
      title: p.title[language],
      subtitle: `${defaultMaterial} · ${defaultColor.name[language]} · ${c.onePc}`,
      imageUrl: p.imageUrl,
      config: {
        material: defaultMaterial,
        colorName: defaultColor.name[language],
        colorHex: defaultColor.hex,
        layerHeight: 0.16,
        infillPercent: 25,
        scalePercent: 100,
        quantity: 1,
      },
      unitPriceGel: p.priceGel,
      totalPriceGel: p.priceGel,
      requiresReview: false,
    };

    onAddToCart(item);
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <section id="catalog-section" className="py-12 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <span>{t.navCatalog}</span>
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">·</span>
              <span>{c.madeInTbilisi}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mt-1">
              {t.catalogTitle}
            </h2>
            <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              {t.catalogSubtitle}
            </p>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Filter Tabs, Category Slider & Controls (Targeted Filter Bar Element) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          {/* Categories Horizontal Carousel Slider with Slide Buttons */}
          <div className="relative flex items-center w-full lg:w-auto overflow-hidden">
            <button
              onClick={() => scrollCategories(-160)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer mr-1 hidden sm:flex shrink-0 border border-neutral-200 dark:border-neutral-800"
              title={c.slideLeft}
              aria-label={c.slideLeft}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={categoryScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto scroll-smooth scrollbar-none py-1"
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => scrollCategories(160)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ml-1 hidden sm:flex shrink-0 border border-neutral-200 dark:border-neutral-800"
              title={c.slideRight}
              aria-label={c.slideRight}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Secondary Filter Controls: Price Range Slider on top, Material & Sorting placed at the bottom of price filter */}
          <div className="flex flex-col gap-2 text-xs w-full sm:w-auto items-stretch sm:items-end shrink-0">
            {/* Price Range Slider */}
            <div className="w-full sm:w-72 shrink-0 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shadow-2xs">
              {/* Header: Label + Item count + Value */}
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                <span className="flex items-center gap-1">
                  <span>{c.maxPrice}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">({filteredProducts.length})</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums w-16 text-right whitespace-nowrap">
                    {maxPrice >= 100
                      ? c.allPrices
                      : `≤ ${maxPrice} ₾`}
                  </span>
                  <button
                    onClick={() => setMaxPrice(100)}
                    className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-opacity cursor-pointer shrink-0 ${
                      maxPrice < 100 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    title={c.resetPriceLimit}
                    aria-label={c.resetPriceFilter}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Slider Track with Dynamic Fill */}
              <div className="relative py-0.5">
                <input
                  type="range"
                  min="25"
                  max="100"
                  step="5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((maxPrice - 25) / 75) * 100}%, rgba(156, 163, 175, 0.3) ${((maxPrice - 25) / 75) * 100}%, rgba(156, 163, 175, 0.3) 100%)`
                  }}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  aria-label={c.priceSliderLabel}
                />
              </div>

              {/* Min/Max Guides & Quick Preset Chips */}
              <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono text-neutral-400 border-t border-neutral-200/60 dark:border-neutral-700/50 mt-1">
                <span>25 ₾</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMaxPrice(40)}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      maxPrice === 40
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-300'
                    }`}
                    title={fmt(c.underPrice, { n: '40' })}
                  >
                    ≤40₾
                  </button>
                  <button
                    onClick={() => setMaxPrice(55)}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      maxPrice === 55
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-300'
                    }`}
                    title={fmt(c.underPrice, { n: '55' })}
                  >
                    ≤55₾
                  </button>
                  <button
                    onClick={() => setMaxPrice(100)}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      maxPrice === 100
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold'
                        : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-300'
                    }`}
                    title={c.showAllPrices}
                  >
                    {c.allShort}
                  </button>
                </div>
                <span>100 ₾</span>
              </div>
            </div>

            {/* Filters at the bottom of the price filter */}
            <div className="flex items-center gap-2 w-full sm:w-72">
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer h-8 text-[11px]"
              >
                <option value="all">{c.allMaterials}</option>
                <option value="PLA">PLA</option>
                <option value="PETG">PETG</option>
                <option value="ABS">ABS / ASA</option>
              </select>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer h-8 text-[11px]"
              >
                <option value="popular">{t.popular}</option>
                <option value="price_asc">{t.priceAsc}</option>
                <option value="price_desc">{t.priceDesc}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Cards Grid: 3-column desktop / 2-column tablet / 1-column mobile */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <Box className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {c.noProducts}
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedMaterial('all');
                setMaxPrice(100);
                setSearchQuery('');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-amber-600 dark:text-amber-400 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              {c.resetFilters}
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => onOpenProductModal(p)}
                className={`group flex flex-col rounded-2xl bg-white dark:bg-neutral-900/60 border hover:border-amber-500/50 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer ${
                  p.featured
                    ? 'border-amber-400/70 ring-1 ring-amber-400/40 shadow-amber-500/10'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {/* Product Image Slot: Takes 65%-70% of card height with neutral solid backdrop */}
                <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
                  <img
                    src={p.imageUrl}
                    alt={p.title[language]}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />

                  {/* Top Overlay Kicker */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900/80 backdrop-blur-xs text-[11px] font-medium text-neutral-200">
                    <span>{p.inStock ? t.readyToShip : t.printOnDemand}</span>
                  </div>

                  {p.featured && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950 text-[11px] font-bold shadow-md">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{c.featured}</span>
                    </div>
                  )}
                </div>

                {/* Card Content & Metadata (Zero-pill discipline) */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    {/* Clean unboxed metadata with typographic separator */}
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
                      <span className="uppercase tracking-wider font-semibold text-[11px] text-amber-600 dark:text-amber-400">
                        {categoryName(p.category)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{p.dimensionsMm.x}×{p.dimensionsMm.y}×{p.dimensionsMm.z} {c.mm}</span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                      {p.title[language]}
                    </h3>

                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                      {p.description[language]}
                    </p>
                  </div>

                  {/* Price & Action Row */}
                  <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-neutral-400 block text-[10px]">{c.price}</span>
                      <span className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono tabular-nums">
                        {p.priceGel} <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">₾</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleQuickAdd(p, e)}
                      disabled={!defaultOptionFor(stock, p)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        addedId === p.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-neutral-100 hover:bg-amber-500 hover:text-neutral-950 dark:bg-neutral-800 dark:hover:bg-amber-400 dark:hover:text-neutral-950 text-neutral-800 dark:text-neutral-200'
                      }`}
                      title={t.addToCart}
                    >
                      {addedId === p.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{c.added}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{defaultOptionFor(stock, p) ? t.addToCart : stockText[language].outOfStock}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
