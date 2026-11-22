import { PrintMaterialType, LayerHeight, PriceBreakdown } from '../types';

export const MATERIAL_DENSITIES: Record<PrintMaterialType, number> = {
  PLA: 1.24, // g/cm³
  PETG: 1.27,
  ABS: 1.05,
  ASA: 1.07,
  TPU: 1.21,
  Resin: 1.15,
};

export const MATERIAL_COST_PER_GRAM: Record<PrintMaterialType, number> = {
  PLA: 0.08, // GEL per gram
  PETG: 0.09,
  ABS: 0.10,
  ASA: 0.12,
  TPU: 0.14,
  Resin: 0.18,
};

// Machine hour cost in GEL (accounting for electricity, wear & tear, nozzle replacement)
export const MACHINE_RATE_PER_HOUR = 4.5; // 4.5 GEL / hr

/**
 * Estimated filament/resin weight for ONE unit of a custom print.
 * Outer walls (3 perimeters ~ 1.2mm) take ~22% of the volume; the inner volume is filled by infill%.
 * Shared by pricing and by warehouse stock deduction so both always agree.
 */
export function estimateGramsPerUnit(
  volumeCm3: number,
  material: PrintMaterialType,
  infillPercent: number,
  scalePercent: number
): number {
  const scaledVolume = volumeCm3 * Math.pow(scalePercent / 100.0, 3);
  const density = MATERIAL_DENSITIES[material] || 1.24;
  const wallRatio = 0.22;
  const effectiveInfill = wallRatio + (1 - wallRatio) * (infillPercent / 100.0);
  return Math.max(4, Math.round(scaledVolume * density * effectiveInfill));
}

/**
 * Calculate printing price using the formula from Section 7 of the specification:
 * Base Material Cost + Machine Time + Setup/Postprocessing + Packaging + Margin
 */
export function calculatePrintPrice(
  volumeCm3: number,
  material: PrintMaterialType,
  layerHeight: LayerHeight,
  infillPercent: number,
  scalePercent: number,
  quantity: number,
  smoothVapor: boolean = false,
  brassInserts: boolean = false
): PriceBreakdown {
  const scale = scalePercent / 100.0;
  const scaledVolume = volumeCm3 * Math.pow(scale, 3);
  const estimatedGramsPerUnit = estimateGramsPerUnit(volumeCm3, material, infillPercent, scalePercent);

  const totalGrams = estimatedGramsPerUnit * quantity;
  const materialCost = totalGrams * (MATERIAL_COST_PER_GRAM[material] || 0.08);

  // Print speed & machine time
  // Bambu Lab X1C / Voron average flow ~16-22 mm³/s -> ~45g PLA per hour at 0.2mm
  // Finer layers (0.12mm) take ~1.6x longer; Draft (0.28mm) takes ~0.7x
  const layerTimeMultiplier =
    layerHeight === 0.12 ? 1.6 : layerHeight === 0.16 ? 1.25 : layerHeight === 0.2 ? 1.0 : 0.75;
  const printHoursPerUnit = Math.max(0.4, (estimatedGramsPerUnit / 35.0) * layerTimeMultiplier);
  const totalHours = Math.round(printHoursPerUnit * quantity * 10) / 10;
  const machineTimeCost = totalHours * MACHINE_RATE_PER_HOUR;

  // Fixed setup, slicing, build plate cleaning
  const preparationCost = 6.0; // 6 GEL per job
  let finishingCost = 0;
  if (smoothVapor) finishingCost += 12.0 * quantity;
  if (brassInserts) finishingCost += 8.0 * quantity;

  // Packaging & shipping prep
  const packagingCost = 4.0;

  // Commercial margin & consumables
  const subtotalBeforeMargin = materialCost + machineTimeCost + preparationCost + finishingCost + packagingCost;
  const marginPercent = 0.35; // 35% margin for business operations
  const subtotal = Math.round((subtotalBeforeMargin * (1 + marginPercent)) * 10) / 10;
  const tax = Math.round(subtotal * 0.18 * 10) / 10; // Georgian VAT 18% included in gross
  const total = Math.max(15, subtotal); // Minimum order price 15 GEL

  const requiresManualReview =
    scaledVolume > 500 || totalHours > 16 || material === 'Resin' || smoothVapor || totalGrams > 800;

  return {
    materialCost: Math.round(materialCost * 10) / 10,
    machineTimeCost: Math.round(machineTimeCost * 10) / 10,
    preparationCost,
    finishingCost,
    packagingCost,
    subtotal: Math.round(subtotal * 10) / 10,
    tax,
    total: Math.round(total),
    estimatedHours: totalHours,
    isEstimateOnly: true,
    requiresManualReview,
  };
}
