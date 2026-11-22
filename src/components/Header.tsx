'use client';

import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { shellText } from '../i18n/shell';
import { ShoppingBag, Sun, Moon, Shield } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  cartCount: number;
  onOpenCart: () => void;
  isStaff: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  language,
  onLanguageChange,
  darkMode,
  onToggleDarkMode,
  cartCount,
  onOpenCart,
  isStaff,
}) => {
  const t = translations[language];
  const s = shellText[language];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Strict Brand Wordmark (Single text element, no adjacent badges) */}
        <button
          onClick={() => onTabChange('home')}
          className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          Geo<span className="text-amber-500">3D</span>
        </button>

        {/* Zone 2: 4–5 single-line clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => onTabChange('catalog')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentTab === 'catalog'
                ? 'text-amber-600 dark:text-amber-400 font-semibold border-b-2 border-amber-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navCatalog}
          </button>
          <button
            onClick={() => onTabChange('custom-print')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentTab === 'custom-print'
                ? 'text-amber-600 dark:text-amber-400 font-semibold border-b-2 border-amber-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navCustomPrint}
          </button>
          <button
            onClick={() => onTabChange('materials')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentTab === 'materials'
                ? 'text-amber-600 dark:text-amber-400 font-semibold border-b-2 border-amber-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navMaterials}
          </button>
          <button
            onClick={() => onTabChange('tracking')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentTab === 'tracking'
                ? 'text-amber-600 dark:text-amber-400 font-semibold border-b-2 border-amber-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navTracking}
          </button>
          <button
            onClick={() => onTabChange('about')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentTab === 'about'
                ? 'text-amber-600 dark:text-amber-400 font-semibold border-b-2 border-amber-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navAbout}
          </button>
          {isStaff && (
            <button
              onClick={() => onTabChange('admin')}
              className={`whitespace-nowrap transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? 'text-amber-600 dark:text-amber-400 font-semibold border-b-2 border-amber-500'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.roleAdmin}</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Actions - Language, Role, Theme, Cart */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Trilingual Segmented Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium">
            <button
              onClick={() => onLanguageChange('ka')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                language === 'ka'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="ქართული"
            >
              GE
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="English"
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('ru')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                language === 'ru'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="Русский"
            >
              RU
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label={s.toggleTheme}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{t.cart}</span>
            {cartCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-neutral-950 text-[11px] font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 flex items-center justify-around overflow-x-auto gap-2 text-xs">
        <button
          onClick={() => onTabChange('catalog')}
          className={`py-1 px-2 whitespace-nowrap ${currentTab === 'catalog' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-600 dark:text-neutral-400'}`}
        >
          {t.navCatalog}
        </button>
        <button
          onClick={() => onTabChange('custom-print')}
          className={`py-1 px-2 whitespace-nowrap ${currentTab === 'custom-print' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-600 dark:text-neutral-400'}`}
        >
          {t.navCustomPrint}
        </button>
        <button
          onClick={() => onTabChange('materials')}
          className={`py-1 px-2 whitespace-nowrap ${currentTab === 'materials' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-600 dark:text-neutral-400'}`}
        >
          {t.navMaterials}
        </button>
        <button
          onClick={() => onTabChange('tracking')}
          className={`py-1 px-2 whitespace-nowrap ${currentTab === 'tracking' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-600 dark:text-neutral-400'}`}
        >
          {t.navTracking}
        </button>
        <button
          onClick={() => onTabChange('about')}
          className={`py-1 px-2 whitespace-nowrap ${currentTab === 'about' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-600 dark:text-neutral-400'}`}
        >
          {t.navAbout}
        </button>
        {isStaff && (
          <button
            onClick={() => onTabChange('admin')}
            className={`py-1 px-2 whitespace-nowrap ${currentTab === 'admin' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-600 dark:text-neutral-400'}`}
          >
            {t.roleAdmin}
          </button>
        )}
      </div>
    </header>
  );
};
