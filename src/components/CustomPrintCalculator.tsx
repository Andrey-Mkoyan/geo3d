'use client';

import React, { useState, useEffect, useId } from 'react';
import * as THREE from 'three';
import {
  Language,
  FileGeometry,
  PrintMaterialType,
  LayerHeight,
  CustomPrintConfig,
  PriceBreakdown,
  CartItem,
  StockOption,
} from '../types';
import { colorLabel, colorsInStock, materialsInStock, stockText } from '../lib/stock';
import { translations } from '../i18n/translations';
import { catalogText } from '../i18n/catalog';
import { fmt } from '../i18n/payment';
import {
  parseSTLFile,
  calculatePrintPrice,
  createSampleGeometry,
  MATERIAL_COST_PER_GRAM,
} from '../utils/stlParser';
import { ThreeDViewer } from './ThreeDViewer';
import {
  UploadCloud,
  FileCode2,
  Check,
  AlertTriangle,
  Info,
  Sliders,
  DollarSign,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';

interface CustomPrintCalculatorProps {
  language: Language;
  stock: StockOption[];
  onAddToCart: (item: CartItem) => void;
}

export const CustomPrintCalculator: React.FC<CustomPrintCalculatorProps> = ({
  language,
  stock,
  onAddToCart,
}) => {
  const t = translations[language];
  const c = catalogText[language];
  // Material + colour choices come from what is currently in the warehouse
  const stockMaterials = materialsInStock(stock);
  const firstStock = colorsInStock(stock, stockMaterials[0])[0];
  const hasStock = stockMaterials.length > 0 && !!firstStock;

  // Active geometry state
  const [activeGeometry, setActiveGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [fileMeta, setFileMeta] = useState<FileGeometry>({
    fileName: 'drone_bracket_v2.stl',
    fileSizeFormatted: '1.8 MB',
    fileSizeBytes: 1887436,
    triangles: 14280,
    bounds: { x: 92, y: 75, z: 44 },
    volumeCm3: 48,
    estimatedGrams: 58,
    isOverBedSize: false,
    isSample: true,
  });

  const [activeSampleType, setActiveSampleType] = useState<'bracket' | 'vase' | 'stand' | 'gear' | 'dragon'>('bracket');

  // Print Configuration State
  const [config, setConfig] = useState<CustomPrintConfig>({
    material: stockMaterials[0] ?? 'PETG',
    colorName: firstStock ? colorLabel(firstStock, language) : '',
    colorHex: firstStock?.hex ?? '#888888',
    layerHeight: 0.2,
    infillPercent: 25,
    scalePercent: 100,
    quantity: 1,
    smoothVapor: false,
    brassInserts: false,
    userNotes: '',
    rightsConfirmed: true,
  });

  useEffect(() => {
    if (!hasStock) return;
    const material = stockMaterials.includes(config.material) ? config.material : stockMaterials[0];
    const colors = colorsInStock(stock, material);
    const color = colors.find((c) => c.hex === config.colorHex) ?? colors[0];
    if (material !== config.material || color.hex !== config.colorHex) {
      setConfig((c) => ({ ...c, material, colorHex: color.hex, colorName: colorLabel(color, language) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock]);

  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown>({
    materialCost: 4.8,
    machineTimeCost: 9.0,
    preparationCost: 6.0,
    finishingCost: 0,
    packagingCost: 4.0,
    subtotal: 32.1,
    tax: 5.8,
    total: 32,
    estimatedHours: 2.0,
    isEstimateOnly: true,
    requiresManualReview: false,
  });

  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  // Load initial sample geometry
  useEffect(() => {
    loadSample('bracket');
  }, []);

  // Recalculate price when geometry or config changes
  useEffect(() => {
    const breakdown = calculatePrintPrice(
      fileMeta.volumeCm3,
      config.material,
      config.layerHeight,
      config.infillPercent,
      config.scalePercent,
      config.quantity,
      config.smoothVapor,
      config.brassInserts
    );
    setPriceBreakdown(breakdown);
  }, [fileMeta.volumeCm3, config]);

  // Load built-in sample geometry
  const loadSample = (type: 'vase' | 'stand' | 'bracket' | 'gear' | 'dragon') => {
    setActiveSampleType(type);
    const sample = createSampleGeometry(type);
    setActiveGeometry(sample.geometry);

    const names = {
      bracket: 'precision_drone_bracket.stl',
      vase: 'parametric_spiral_vase.stl',
      stand: 'desktop_phone_dock.stl',
      gear: 'planetary_gear_bearing.stl',
      dragon: 'articulated_dragon_link.stl',
    };

    setFileMeta({
      fileName: names[type],
      fileSizeFormatted: '2.4 MB',
      fileSizeBytes: 2516582,
      triangles: sample.triangles,
      bounds: sample.bounds,
      volumeCm3: sample.volumeCm3,
      estimatedGrams: Math.round(sample.volumeCm3 * 1.25 * 0.35),
      isOverBedSize: sample.bounds.x > 256 || sample.bounds.y > 256 || sample.bounds.z > 256,
      isSample: true,
    });
    setErrorMessage(null);
  };

  // Handle STL file upload from computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.stl') && !file.name.toLowerCase().endsWith('.obj')) {
      setErrorMessage(c.errInvalidFile);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(c.errFileSize);
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseSTLFile(buffer);
        setActiveGeometry(parsed.geometry);

        const sizeFormatted =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        setFileMeta({
          fileName: file.name,
          fileSizeFormatted: sizeFormatted,
          fileSizeBytes: file.size,
          triangles: parsed.triangles,
          bounds: parsed.bounds,
          volumeCm3: parsed.volumeCm3,
          estimatedGrams: Math.round(parsed.volumeCm3 * 1.25 * 0.35),
          isOverBedSize: parsed.bounds.x > 256 || parsed.bounds.y > 256 || parsed.bounds.z > 256,
          warnings: parsed.warnings,
          isSample: false,
        });
      } catch (err) {
        console.error('Failed to parse STL:', err);
        setErrorMessage(c.errParse);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage(c.errRead);
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Scaled dimensions
  const scale = config.scalePercent / 100;
  const scaledBounds = {
    x: Math.round(fileMeta.bounds.x * scale),
    y: Math.round(fileMeta.bounds.y * scale),
    z: Math.round(fileMeta.bounds.z * scale),
  };
  const isOverBed = scaledBounds.x > 256 || scaledBounds.y > 256 || scaledBounds.z > 256;

  // Add configured model to cart
  const handleAddToCart = () => {
    if (!config.rightsConfirmed) {
      setErrorMessage(t.legalRightsNotice);
      return;
    }

    const newItem: CartItem = {
      cartItemId: `custom-${Date.now()}`,
      type: 'custom_file',
      title: fileMeta.fileName,
      subtitle: `${config.material} · ${config.colorName} · ${config.layerHeight}mm · ${fmt(c.infillN, { n: String(config.infillPercent) })} · ${fmt(c.pcsN, { n: String(config.quantity) })}`,
      geometry: { ...fileMeta, bounds: scaledBounds },
      config: { ...config },
      unitPriceGel: Math.round((priceBreakdown.total / config.quantity) * 10) / 10,
      totalPriceGel: priceBreakdown.total,
      requiresReview: priceBreakdown.requiresManualReview || isOverBed,
    };

    onAddToCart(newItem);
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2500);
  };

  const fileInputId = useId();

  return (
    <section id="custom-print-section" className="py-12 bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <span>{t.navCustomPrint}</span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>{c.slicerEngine}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mt-1">
            {t.customPrintTitle}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-3xl">
            {t.customPrintSubtitle}
          </p>
        </div>

        {/* 2-Column Split: Left 3D Viewer & Upload, Right Configurator & Price */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): Dropzone, Sample Selector & 3D Interactive View */}
          <div className="lg:col-span-7 space-y-4">
            {/* Dropzone */}
            <div className="relative border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900/60 text-center hover:border-amber-500/80 transition-colors">
              <input
                id={fileInputId}
                type="file"
                accept=".stl,.obj"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                  {t.dropzoneTitle}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {t.dropzoneSubtitle}
                </p>
              </div>
            </div>

            {/* Quick Sample Selector */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                {t.sampleModels}
              </span>
              {(['bracket', 'vase', 'stand', 'gear', 'dragon'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => loadSample(type)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    activeSampleType === type && fileMeta.isSample
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-semibold'
                      : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  {type === 'bracket' && t.sampleBracket}
                  {type === 'vase' && t.sampleVase}
                  {type === 'stand' && t.sampleStand}
                  {type === 'gear' && t.sampleGear}
                  {type === 'dragon' && t.sampleDragon}
                </button>
              ))}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Over Bed Warning */}
            {isOverBed && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{t.warningOverBed}</span>
              </div>
            )}

            {/* Interactive Three.js 3D Viewport */}
            <div className="relative">
              {isParsing && (
                <div className="absolute inset-0 z-30 bg-neutral-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white rounded-xl">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-xs font-mono">{c.parsingMesh}</span>
                </div>
              )}
              <ThreeDViewer
                geometry={activeGeometry}
                materialColor={config.colorHex}
                materialType={config.material}
                bounds={scaledBounds}
                language={language}
                heightClass="h-[460px]"
              />
            </div>

            {/* Geometry Spec Metrics Strip (Tabular discipline, Anti-slop clean unboxed) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {t.fileDimensions}
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
                  {scaledBounds.x} × {scaledBounds.y} × {scaledBounds.z} {c.mm}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {t.modelVolume}
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
                  {Math.round(fileMeta.volumeCm3 * Math.pow(scale, 3) * 10) / 10} cm³
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {t.estimatedWeight}
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
                  ~{Math.round(fileMeta.estimatedGrams * Math.pow(scale, 3))} g ({config.material})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {t.trianglesCount}
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
                  {fileMeta.triangles.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Parameter Configurator & Real-time Quote Card */}
          <div className="lg:col-span-5 space-y-5">
            {/* Configuration Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span>{c.printSpecs}</span>
                </div>
                <span className="text-xs font-mono text-neutral-500">
                  {fileMeta.fileName}
                </span>
              </div>

              {/* 1. Polymer Material Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t.materialType}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {!hasStock && (
                    <span className="col-span-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {stockText[language].noMaterial}
                    </span>
                  )}
                  {stockMaterials.map((mat) => (
                    <button
                      key={mat}
                      onClick={() => {
                        const colors = colorsInStock(stock, mat);
                        const color = colors.find((c) => c.hex === config.colorHex) ?? colors[0];
                        setConfig({ ...config, material: mat, colorHex: color.hex, colorName: colorLabel(color, language) });
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-left ${
                        config.material === mat
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                      }`}
                    >
                      <div>{mat}</div>
                      <div className="text-[10px] font-normal text-neutral-500">
                        {MATERIAL_COST_PER_GRAM[mat]} ₾/g
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Color Finish Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t.colorSelect}: <span className="font-normal text-neutral-500">{config.colorName}</span>
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {colorsInStock(stock, config.material).map((col) => (
                    <button
                      key={col.hex}
                      onClick={() =>
                        setConfig({
                          ...config,
                          colorHex: col.hex,
                          colorName: colorLabel(col, language),
                        })
                      }
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                        config.colorHex === col.hex
                          ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-neutral-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={colorLabel(col, language)}
                    >
                      {config.colorHex === col.hex && (
                        <Check className={`w-3.5 h-3.5 ${col.hex === '#f4f4f5' || col.hex === '#f0ede6' ? 'text-black' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Layer Height (Quality) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t.layerHeightLabel}
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {([0.28, 0.2, 0.16, 0.12] as LayerHeight[]).map((lh) => (
                    <button
                      key={lh}
                      onClick={() => setConfig({ ...config, layerHeight: lh })}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-colors cursor-pointer ${
                        config.layerHeight === lh
                          ? 'border-amber-500 bg-amber-500 text-neutral-950 font-bold'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                      }`}
                    >
                      <div className="font-mono">{lh}{c.mm}</div>
                      <div className="text-[10px] font-normal opacity-80">
                        {lh === 0.28 ? c.layerDraft : lh === 0.2 ? c.layerStandard : lh === 0.16 ? c.layerFine : c.layerUltra}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Infill Density Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <span>{t.infillLabel}</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {config.infillPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={config.infillPercent}
                  onChange={(e) => setConfig({ ...config, infillPercent: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1">
                  <span>{c.infillDecor}</span>
                  <span>{c.infillStandard}</span>
                  <span>{c.infillRigid}</span>
                  <span>{c.infillSolid}</span>
                </div>
              </div>

              {/* 5. Scale & Quantity Row */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                {/* Scale */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    <span>{t.scaleLabel}</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">{config.scalePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={config.scalePercent}
                    onChange={(e) => setConfig({ ...config, scalePercent: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Quantity Stepper */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    {t.quantityLabel}
                  </label>
                  <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                    <button
                      onClick={() => setConfig({ ...config, quantity: Math.max(1, config.quantity - 1) })}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {config.quantity}
                    </span>
                    <button
                      onClick={() => setConfig({ ...config, quantity: config.quantity + 1 })}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 6. Post-processing add-ons */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {t.additionalOptions}
                </label>
                <label className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.smoothVapor}
                    onChange={(e) => setConfig({ ...config, smoothVapor: e.target.checked })}
                    className="rounded accent-amber-500"
                  />
                  <span>{t.optionVapor}</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.brassInserts}
                    onChange={(e) => setConfig({ ...config, brassInserts: e.target.checked })}
                    className="rounded accent-amber-500"
                  />
                  <span>{t.optionInserts}</span>
                </label>
              </div>

              {/* 7. Special Notes */}
              <div>
                <textarea
                  rows={2}
                  value={config.userNotes}
                  onChange={(e) => setConfig({ ...config, userNotes: e.target.value })}
                  placeholder={t.userNotesPlaceholder}
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* 8. Mandatory Legal Confirmation (PDF Spec Section 3.4 & 9) */}
              <label className="flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={config.rightsConfirmed}
                  onChange={(e) => setConfig({ ...config, rightsConfirmed: e.target.checked })}
                  className="mt-0.5 rounded accent-amber-500 shrink-0"
                />
                <span className="leading-snug">{t.legalRightsNotice}</span>
              </label>
            </div>

            {/* Transparent Cost Breakdown Card (Formula from Section 7) */}
            <div className="p-6 rounded-2xl bg-neutral-900 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>{t.priceBreakdownTitle}</span>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  {fmt(c.estTime, { h: String(priceBreakdown.estimatedHours) })}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-neutral-300">
                  <span>{t.materialCost} ({fmt(c.pcsN, { n: String(config.quantity) })})</span>
                  <span className="tabular-nums">{priceBreakdown.materialCost.toFixed(2)} ₾</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>{t.machineTimeCost} ({priceBreakdown.estimatedHours} {t.hours})</span>
                  <span className="tabular-nums">{priceBreakdown.machineTimeCost.toFixed(2)} ₾</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>{t.prepCost}</span>
                  <span className="tabular-nums">{priceBreakdown.preparationCost.toFixed(2)} ₾</span>
                </div>
                {priceBreakdown.finishingCost > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>{t.finishingCost}</span>
                    <span className="tabular-nums">+{priceBreakdown.finishingCost.toFixed(2)} ₾</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-300">
                  <span>{t.packagingCost}</span>
                  <span className="tabular-nums">{priceBreakdown.packagingCost.toFixed(2)} ₾</span>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wider">{t.totalPrice}</div>
                  <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
                    {priceBreakdown.total.toFixed(2)} <span className="text-base font-normal">₾</span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-neutral-400">
                  <span>{c.vatIncluded}</span>
                </div>
              </div>

              {/* Mandatory Honest Estimate Disclaimer from Spec Section 3.4 */}
              <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700/60 text-[11px] text-neutral-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{t.disclaimerEstimate}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={handleAddToCart}
                  disabled={!config.rightsConfirmed || isOverBed || !hasStock}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    isAddedFeedback
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isAddedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{c.addedToCart}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{t.calculateAndAdd}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
