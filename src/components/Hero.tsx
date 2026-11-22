'use client';

import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { shellText } from '../i18n/shell';
import { ArrowRight, UploadCloud, CheckCircle2, ShieldCheck, Clock, Zap } from 'lucide-react';

interface HeroProps {
  language: Language;
  onNavigateToCatalog: () => void;
  onNavigateToUpload: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  language,
  onNavigateToCatalog,
  onNavigateToUpload,
}) => {
  const t = translations[language];
  const s = shellText[language];

  return (
    <section className="relative overflow-hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Split Hero: Content Left, Editorial Workshop Image Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left Column: Heading, Subtitle, Direct Action CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Quiet 1-line Text Kicker with Typographic Separator (Anti-slop Zero-Pill) */}
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4 tracking-wide uppercase">
              <span>{t.heroBadge}</span>
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">·</span>
              <span className="text-neutral-500 dark:text-neutral-400">{s.heroCities}</span>
            </div>

            {/* Display Headline with balanced wrap */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-[1.15] text-balance">
              {t.heroTitle}
            </h1>

            {/* Body Prose */}
            <p className="mt-5 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
              {t.heroSubtitle}
            </p>

            {/* Two Primary CTAs from Specification Section 3.1 */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={onNavigateToUpload}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <UploadCloud className="w-4 h-4 text-neutral-950" />
                <span>{t.heroCtaUpload}</span>
              </button>
              <button
                onClick={onNavigateToCatalog}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-sm font-semibold border border-neutral-300 dark:border-neutral-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>{t.heroCtaCatalog}</span>
                <ArrowRight className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Trust Bullet Callouts */}
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>STL / 3MF / OBJ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{s.heroMeshCheck}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{s.heroReady}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Workshop Image with Natural Scrim & Equipment Card */}
          <div className="lg:col-span-5 relative flex items-center">
            <div className="w-full h-80 sm:h-96 lg:h-full min-h-[360px] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xl relative group">
              <img
                src="/images/hero_3d_print_workshop_1794300310093.jpg"
                alt={s.heroImgAlt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                referrerPolicy="no-referrer"
              />
              {/* Measured contrast scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/20 to-transparent pointer-events-none" />

              {/* Bottom Overlay Label */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-neutral-900/85 border border-neutral-700/60 backdrop-blur-md text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Bambu Lab X1C & Voron 2.4
                    </div>
                    <div className="text-sm font-bold text-neutral-100 mt-0.5">
                      {s.heroFacility}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-neutral-300 font-mono">0.05mm - 0.28mm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column KPI Strip in a Full-Width Row Below the Split (Frontend Design Compliant) */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800">
            <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {t.heroStat1Value}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t.heroStat1Label}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800">
            <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {t.heroStat2Value}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t.heroStat2Label}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800">
            <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {t.heroStat3Value}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t.heroStat3Label}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800">
            <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {t.heroStat4Value}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t.heroStat4Label}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
