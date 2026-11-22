'use client';

import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { contentText } from '../i18n/content';
import { MapPin, Phone, Mail, Clock, ShieldCheck, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AboutAndFaqViewProps {
  language: Language;
}

export const AboutAndFaqView: React.FC<AboutAndFaqViewProps> = ({ language }) => {
  const t = translations[language];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const c = contentText[language];
  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({ q: c[`faq${n}q`], a: c[`faq${n}a`] }));

  return (
    <section className="py-12 bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Workshop Location & Contact Card */}
        <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
            <span>{t.navAbout}</span>
            <span aria-hidden="true">·</span>
            <span>{c.abTag}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                {c.abTitle}
              </h2>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {c.abIntro}
              </p>

              <div className="mt-6 space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{c.abAddress}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{c.abHours}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-mono">+995 32 200 3D3D / Telegram @Geo3DLab</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-mono">lab@geo3d.ge</span>
                </div>
              </div>
            </div>

            {/* Equipment Snapshot Card */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                {c.abEquipTitle}
              </h3>
              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>{c.abFdmLabel}</strong> {c.abFdm}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>{c.abResinLabel}</strong> {c.abResin}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>{c.abPolyLabel}</strong> {c.abPoly}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>{c.abFinishLabel}</strong> {c.abFinish}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>{c.faqTag}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {c.faqTitle}
          </h2>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 pt-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left text-sm font-bold text-neutral-900 dark:text-white hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-amber-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pr-6">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
