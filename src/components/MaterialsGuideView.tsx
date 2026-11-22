'use client';

import React from 'react';
import { Language, PrintMaterialType } from '../types';
import { translations } from '../i18n/translations';
import { contentText } from '../i18n/content';
import { Layers, Thermometer, ShieldCheck, Zap, Droplets, Sun, Sparkles } from 'lucide-react';

interface MaterialsGuideViewProps {
  language: Language;
  onSelectMaterialForUpload: (mat: PrintMaterialType) => void;
}

export const MaterialsGuideView: React.FC<MaterialsGuideViewProps> = ({
  language,
  onSelectMaterialForUpload,
}) => {
  const t = translations[language];
  const c = contentText[language];

  const materialsList: {
    type: PrintMaterialType;
    name: string;
    description: Record<Language, string>;
    tempResistance: string;
    impactStrength: string;
    weatherResistance: string;
    idealFor: string;
    recommendationBadge?: string;
  }[] = [
    {
      type: 'PLA',
      name: 'PLA (Polylactic Acid)',
      description: {
        ka: 'ეკოლოგიური ბიოდეგრადირებადი პოლიმერი სიმინდის სახამებლის ბაზაზე. გამოირჩევა მაღალი ვიზუალური ხარისხით, წვრილი დეტალიზაციითა და მინიმალური დეფორმაციით.',
        en: 'Eco-friendly corn-starch polymer with crisp aesthetic finish, razor-sharp overhangs, and minimal warping. Best for decorative and indoor functional models.',
        ru: 'Экологичный биоразлагаемый полимер на основе кукурузного крахмала. Высочайшая детализация, отсутствие усадки и эстетичная поверхность.',
      },
      tempResistance: '55°C',
      impactStrength: c.matPLAImpact,
      weatherResistance: c.matPLAWeather,
      idealFor: c.matPLAIdeal,
      recommendationBadge: c.matPLABadge,
    },
    {
      type: 'PETG',
      name: 'PETG (Polyethylene Terephthalate Glycol)',
      description: {
        ka: 'საუკეთესო უნივერსალური მასალა. გამოირჩევა მაღალი სიმტკიცით, წყალგამძლეობით, ქიმიური მდგრადობითა და დარტყმის ატანით.',
        en: 'The industry workhorse. Combines ease of printing with mechanical toughness, moisture resistance, and chemical stability.',
        ru: 'Идеальный баланс прочности и простоты. Водостойкий, ударопрочный полимер, выдерживающий умеренные нагрузки и химические воздействия.',
      },
      tempResistance: '75°C',
      impactStrength: c.matPETGImpact,
      weatherResistance: c.matPETGWeather,
      idealFor: c.matPETGIdeal,
      recommendationBadge: c.matPETGBadge,
    },
    {
      type: 'ABS',
      name: 'ABS / ASA Engineering Grade',
      description: {
        ka: 'ინდუსტრიული თერმოპლასტი. უძლებს 100°C+ ტემპერატურას. ASA შეიცავს UV-სტაბილიზატორს და იდეალურია მანქანის დეტალებისა და გარე გამოყენებისთვის.',
        en: 'High-temperature industrial thermoplastics. ASA adds UV-stabilizers, making it impervious to Georgia’s summer sun and automotive temperatures.',
        ru: 'Промышленные термопласты с теплостойкостью до 105°C. ASA устойчив к палящему солнцу и идеален для деталей автомобилей и уличных приборов.',
      },
      tempResistance: '105°C',
      impactStrength: c.matABSImpact,
      weatherResistance: c.matABSWeather,
      idealFor: c.matABSIdeal,
    },
    {
      type: 'TPU',
      name: 'TPU 95A (Flexible Rubber)',
      description: {
        ka: 'მოქნილი ელასტიური რეზინისებრი პოლიმერი. იდეალურია დამცავი ქეისებისთვის, ამორტიზატორებისთვის, მილებისა და რბილი ბალიშებისთვის.',
        en: 'Rubber-like thermoplastic polyurethane. Exceptional abrasion resistance, energy dampening, and elastic recovery under strain.',
        ru: 'Эластичный полиуретан с твердостью 95A по Шору. Поглощает удары, не ломается при скручивании. Идеален для бамперов и виброгасителей.',
      },
      tempResistance: '80°C',
      impactStrength: c.matTPUImpact,
      weatherResistance: c.matTPUWeather,
      idealFor: c.matTPUIdeal,
    },
    {
      type: 'Resin',
      name: 'High-Resolution UV Resin (SLA 8K)',
      description: {
        ka: 'ფოტოპოლიმერული ფისოვანი ბეჭდვა 50 მიკრონიანი შრით. არ გააჩნია ხილული ფენები. იდეალურია საიუველირო ნაკეთობებისთვის, მინიატურებისა და სტომატოლოგიური მოდელებისთვის.',
        en: '8K Stereolithography liquid resin printing. Layer height down to 0.05mm with near-invisible layer lines. Perfect for figurines, miniatures, and master casting patterns.',
        ru: 'Стереолитографическая 3D-печать фотополимерной смолой. Слой 50 микрон, гладкая литьевая поверхность. Для ювелирных мастер-моделей и миниатюр.',
      },
      tempResistance: '60°C',
      impactStrength: c.matResinImpact,
      weatherResistance: c.matResinWeather,
      idealFor: c.matResinIdeal,
    },
  ];

  return (
    <section className="py-12 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
            <span>{t.navMaterials}</span>
            <span aria-hidden="true">·</span>
            <span>{c.matTag}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            {c.matTitle}
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {c.matSubtitle}
          </p>
        </div>

        <div className="space-y-6">
          {materialsList.map((mat) => (
            <div
              key={mat.type}
              className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {mat.name}
                    </h3>
                    {mat.recommendationBadge && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {mat.recommendationBadge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {mat.description[language]}
                  </p>

                  <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <strong className="text-neutral-700 dark:text-neutral-300">{c.matRecommended}</strong> {mat.idealFor}
                  </div>
                </div>

                {/* Technical Metric Pills */}
                <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center shrink-0 w-full lg:w-72">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <Thermometer className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                    <span className="text-[10px] text-neutral-400 block">{c.matHeat}</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{mat.tempResistance}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <ShieldCheck className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                    <span className="text-[10px] text-neutral-400 block">{c.matToughness}</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{mat.impactStrength}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <Sun className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                    <span className="text-[10px] text-neutral-400 block">{c.matWeathering}</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{mat.weatherResistance}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
