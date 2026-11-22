export type Language = 'ka' | 'en' | 'ru';

export type UserRole = 'guest' | 'client' | 'operator_orders' | 'operator_prod' | 'admin';

export type PrintMaterialType = 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'ASA' | 'Resin';

export type LayerHeight = 0.12 | 0.16 | 0.20 | 0.28;

export type OrderStatus =
  | 'awaiting_payment'
  | 'awaiting_review'
  | 'confirmed'
  | 'preparation'
  | 'printing'
  | 'ready'
  | 'awaiting_courier'
  | 'shipped'
  | 'cancelled';

export type PaymentStatus =
  | 'awaiting_quote'
  | 'awaiting_payment'
  | 'proof_submitted'
  | 'verified'
  | 'rejected'
  | 'refunded';

export type ProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'STALE';

export interface PaymentProofInfo {
  id: string;
  status: ProofStatus;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectReason?: string;
  amountClaimedGel?: number;
  payerName?: string;
  bankName?: string;
  transferDate?: string;
  /** Authenticated admin-only URLs; absent in the public tracking view */
  imageUrl?: string;
  thumbUrl?: string;
}

export interface BankAccount {
  bank: string;
  iban: string;
  recipient: string;
}

export interface PublicSettings {
  bankAccounts: BankAccount[];
  deliveryFees: { tbilisi_courier: number; regional_courier: number; self_pickup: number };
  pickupAddress: string;
}

export interface BoundingBox {
  x: number; // width in mm
  y: number; // depth in mm
  z: number; // height in mm
}

export interface FileGeometry {
  fileName: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
  triangles: number;
  bounds: BoundingBox;
  volumeCm3: number;
  estimatedGrams: number;
  isOverBedSize: boolean;
  warnings?: string[];
  stlDataUrl?: string;
  isSample?: boolean;
}

export interface CustomPrintConfig {
  material: PrintMaterialType;
  colorName: string;
  colorHex: string;
  layerHeight: LayerHeight;
  infillPercent: number;
  scalePercent: number;
  quantity: number;
  smoothVapor: boolean;
  brassInserts: boolean;
  userNotes: string;
  rightsConfirmed: boolean;
}

export interface PriceBreakdown {
  materialCost: number;
  machineTimeCost: number;
  preparationCost: number;
  finishingCost: number;
  packagingCost: number;
  subtotal: number;
  tax: number;
  total: number;
  estimatedHours: number;
  isEstimateOnly: boolean;
  requiresManualReview: boolean;
}

export interface Product {
  id: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  category: string;
  priceGel: number;
  imageUrl: string;
  /** Gallery photos in display order; the first one is the cover. */
  images?: string[];
  dimensionsMm: BoundingBox;
  weightGrams: number;
  materials: PrintMaterialType[];
  availableColors: { name: Record<Language, string>; hex: string }[];
  leadTimeHours: number;
  inStock: boolean;
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  tags: string[];
  /** Link to the model page (e.g. MakerWorld) */
  modelUrl?: string;
  slug?: string;
  published?: boolean;
  presetModelType?: 'vase' | 'stand' | 'bracket' | 'gear' | 'dragon' | 'tag';
}

export interface CartItem {
  cartItemId: string;
  type: 'catalog_product' | 'custom_file';
  productId?: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  geometry?: FileGeometry;
  config: {
    material: PrintMaterialType;
    colorName: string;
    colorHex: string;
    layerHeight: LayerHeight;
    infillPercent: number;
    scalePercent: number;
    quantity: number;
    smoothVapor?: boolean;
    brassInserts?: boolean;
    userNotes?: string;
  };
  unitPriceGel: number;
  totalPriceGel: number;
  requiresReview: boolean;
  /** Link to the source 3D model (staff view only). */
  modelRef?: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
  operatorName?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "GEO-4821"
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryMethod: 'tbilisi_courier' | 'regional_courier' | 'self_pickup';
  deliveryAddress: string;
  city: string;
  paymentStatus: PaymentStatus;
  paymentProofs: PaymentProofInfo[];
  items: CartItem[];
  subtotalGel: number;
  deliveryGel: number;
  discountGel: number;
  totalGel: number;
  status: OrderStatus;
  assignedPrinterId?: string;
  assignedOperator?: string;
  estimatedCompletion: string;
  timeline: OrderTimelineEvent[];
  internalNotes?: string;
}

export interface MaterialSpool {
  id: string;
  type: PrintMaterialType;
  brand: string;
  colorName: string;
  colorHex: string;
  diameterMm: number; // 1.75
  totalWeightGrams: number;
  remainingGrams: number;
  purchaseCostGel: number;
  minThresholdGrams: number;
  location: string;
}

export interface PrinterUnit {
  id: string;
  name: string;
  model: string;
  technology: 'FDM' | 'SLA';
  buildVolumeMm: BoundingBox;
  supportedMaterials: PrintMaterialType[];
  status: 'idle' | 'printing' | 'maintenance' | 'offline';
  currentOrderId?: string;
  currentProgressPercent?: number;
  timeRemainingMinutes?: number;
  totalPrintHours: number;
  lastMaintenanceDate: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'order' | 'catalog' | 'material' | 'printer' | 'price';
  entityId: string;
  details: string;
}

/** One selectable material + colour that is currently in the warehouse (summed over all spools of that type/colour). */
export interface StockOption {
  type: PrintMaterialType;
  hex: string;
  /** Spool colour name as entered by staff */
  name: string;
  availableGrams: number;
}

export interface Category {
  id: string;
  name: Record<Language, string>;
  sortOrder: number;
  active: boolean;
  productCount?: number;
}
