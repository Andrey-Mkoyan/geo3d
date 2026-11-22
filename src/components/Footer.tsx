'use client';

import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { shellText } from '../i18n/shell';

interface FooterProps {
  language: Language;
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigate }) => {
  const t = translations[language];
  const s = shellText[language];

  return (
    <footer className="w-full bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-2 md:col-span-1">
            <div className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">
              Geo<span className="text-amber-500">3D</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {s.footerTagline}
            </p>
            <div className="text-[11px] font-mono text-neutral-400 pt-1">
              {s.footerPayments}
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
              {s.footerService}
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navCatalog}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('custom-print')}
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navCustomPrint}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('materials')}
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navMaterials}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('tracking')}
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navTracking}
                </button>
              </li>
            </ul>
          </div>

          {/* Workshop Contact */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
              {s.footerWorkshop}
            </h4>
            <ul className="space-y-1 text-neutral-500">
              <li>{t.footerAddress}</li>
              <li className="font-mono">{t.footerPhone}</li>
              <li className="font-mono">{t.footerEmail}</li>
              <li>{s.footerHours}</li>
            </ul>
          </div>

          {/* Trust and Guarantees */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
              {s.footerCommitment}
            </h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {t.warrantyNotice}
            </p>
            <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {s.footerPrivacy}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-400 text-[11px]">
          <div>{t.footerCopyright}</div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('about')}
              className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            >
              {t.termsAndPrivacy}
            </button>
            <span>·</span>
            <span>{s.footerMadeIn}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
