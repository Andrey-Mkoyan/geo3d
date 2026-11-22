'use client';

import React, { useState } from 'react';
import {
  Order,
  OrderStatus,
  PrinterUnit,
  MaterialSpool,
  AuditLogEntry,
  Language,
  PaymentProofInfo,
  PrintMaterialType,
} from '../types';
import { paymentStatusLabels } from '../i18n/payment';
import { translations } from '../i18n/translations';
import { AdminCatalog } from './AdminCatalog';
import {
  Shield,
  Layers,
  Printer,
  Package,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  DollarSign,
  TrendingUp,
  Cpu,
  Plus,
  Edit2,
  Printer as PrintIcon,
} from 'lucide-react';

export interface NewSpoolInput {
  type: PrintMaterialType;
  brand: string;
  colorName: string;
  colorHex: string;
  diameterMm: number;
  totalWeightGrams: number;
  remainingGrams?: number;
  purchaseCostGel: number;
  minThresholdGrams: number;
  location: string;
}

interface AdminWorkspaceProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, note?: string) => Promise<void> | void;
  onUpdateOrderPrice: (orderId: string, newTotalGel: number) => Promise<void> | void;
  onReviewPayment: (
    orderId: string,
    decision: { action: 'approve' } | { action: 'reject'; reason: string }
  ) => Promise<void>;
  printers: PrinterUnit[];
  materials: MaterialSpool[];
  onUpdateMaterialSpool: (spoolId: string, remainingGrams: number) => void;
  onAddMaterial: (spool: NewSpoolInput) => Promise<boolean>;
  onDeleteMaterial: (spoolId: string) => Promise<void> | void;
  auditLogs: AuditLogEntry[];
  language: Language;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  orders,
  onUpdateOrderStatus,
  onUpdateOrderPrice,
  onReviewPayment,
  printers,
  materials,
  onUpdateMaterialSpool,
  onAddMaterial,
  onDeleteMaterial,
  auditLogs,
  language,
}) => {
  const t = translations[language];

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'printers' | 'materials' | 'catalog' | 'audit'>('overview');

  // Selected Order for detail & price editing
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id || null);
  const [priceEditInput, setPriceEditInput] = useState<number>(0);
  const [statusNoteInput, setStatusNoteInput] = useState('');
  const [activeJobTicketOrder, setActiveJobTicketOrder] = useState<Order | null>(null);
  const [onlyToReview, setOnlyToReview] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [zoomProof, setZoomProof] = useState<PaymentProofInfo | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [showSpoolForm, setShowSpoolForm] = useState(false);
  const [spoolBusy, setSpoolBusy] = useState(false);
  const emptySpool = {
    type: 'PLA' as PrintMaterialType,
    brand: '',
    colorName: '',
    colorHex: '#c86432',
    diameterMm: '1.75',
    totalWeightGrams: '1000',
    remainingGrams: '',
    purchaseCostGel: '',
    minThresholdGrams: '200',
    location: '',
  };
  const [spoolForm, setSpoolForm] = useState(emptySpool);
  const payLabels = paymentStatusLabels[language];

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  // Dashboard Stats
  const activeOrdersCount = orders.filter((o) => o.status !== 'shipped' && o.status !== 'cancelled').length;
  const toReviewCount = orders.filter((o) => o.paymentStatus === 'proof_submitted').length;
  const visibleOrders = onlyToReview ? orders.filter((o) => o.paymentStatus === 'proof_submitted') : orders;
  const totalRevenue = orders.filter((o) => o.paymentStatus === 'verified').reduce((sum, o) => sum + o.totalGel, 0);
  const runningPrintersCount = printers.filter((p) => p.status === 'printing').length;
  const fleetUtilizationPercent = printers.length ? Math.round((runningPrintersCount / printers.length) * 100) : 0;
  const lowSpools = materials.filter((m) => m.remainingGrams <= m.minThresholdGrams);

  const handlePriceUpdate = () => {
    if (selectedOrder && priceEditInput > 0) {
      onUpdateOrderPrice(selectedOrder.id, priceEditInput);
      alert(`Price for ${selectedOrder.orderNumber} updated to ${priceEditInput} GEL`);
    }
  };

  const handleAdvanceStatus = (nextStatus: OrderStatus) => {
    if (!selectedOrder) return;
    onUpdateOrderStatus(selectedOrder.id, nextStatus, statusNoteInput || undefined);
    setStatusNoteInput('');
  };

  return (
    <div className="py-8 bg-neutral-100 dark:bg-neutral-950 min-h-screen text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Restricted Workshop Portal · RBAC Operator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {t.adminDashboardTitle}
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.adminTabOverview}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.adminTabOrders} ({orders.length})
              {toReviewCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold">
                  {toReviewCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('printers')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'printers'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.adminTabPrinters} ({runningPrintersCount}/{printers.length})
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'materials'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.adminTabMaterials}
              {lowSpools.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {lowSpools.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {language === 'ka' ? 'კატალოგი' : language === 'ru' ? 'Каталог' : 'Catalog'}
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.adminTabAudit}
            </button>
          </div>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="mt-8 space-y-8 animate-in fade-in duration-200">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{t.statTotalOrders}</span>
                  <Package className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black mt-2 font-mono tabular-nums">
                  {activeOrdersCount}
                </div>
                <span className={`text-[11px] font-medium ${toReviewCount ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {toReviewCount ? `${toReviewCount} payment(s) waiting for review` : 'No payments waiting for review'}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{t.statRevenue}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black mt-2 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {totalRevenue.toFixed(2)} ₾
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">Verified bank transfers</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{t.statFleetUtilization}</span>
                  <Cpu className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black mt-2 font-mono tabular-nums">
                  {fleetUtilizationPercent}%
                </div>
                <span className="text-[11px] text-neutral-400">
                  {runningPrintersCount} of {printers.length} printing
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{t.statLowMaterialAlerts}</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black mt-2 font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  {lowSpools.length}
                </div>
                <span className="text-[11px] text-neutral-400">Under 250g threshold</span>
              </div>
            </div>

            {/* Live Printers Status Grid */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">
                Active 3D Hardware Telemetry
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {printers.map((prn) => (
                  <div
                    key={prn.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold truncate">{prn.name}</h4>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase ${
                          prn.status === 'printing'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {prn.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 font-mono mt-1">
                      {prn.model} · Bed: {prn.buildVolumeMm.x}×{prn.buildVolumeMm.y} mm
                    </div>

                    {prn.status === 'printing' && prn.currentProgressPercent && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] font-mono text-neutral-600 dark:text-neutral-400 mb-1">
                          <span>Job: {prn.currentOrderId}</span>
                          <span className="font-bold">{prn.currentProgressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${prn.currentProgressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-400 block mt-1">
                          Remaining: ~{prn.timeRemainingMinutes} mins
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. ORDERS & QUOTES TAB (Section 5.3) */}
        {activeTab === 'orders' && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Orders List (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                All Orders ({visibleOrders.length})
              </h3>
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyToReview}
                  onChange={(e) => setOnlyToReview(e.target.checked)}
                  className="accent-amber-500"
                />
                Only payments to review ({toReviewCount})
              </label>

              <div className="space-y-2">
                {visibleOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setSelectedOrderId(o.id);
                      setPriceEditInput(o.totalGel);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedOrder?.id === o.id
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/10'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-neutral-50/50 dark:bg-neutral-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                        {o.orderNumber}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {o.totalGel.toFixed(2)} ₾
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-1 truncate">
                      {o.customerName}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2">
                      <span className="uppercase text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {o.status.replace(/_/g, ' ')}
                        <span
                          className={`ml-1.5 normal-case ${
                            o.paymentStatus === 'proof_submitted' ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500'
                          }`}
                        >
                          · {payLabels[o.paymentStatus]}
                        </span>
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Order Operator Panel (7 cols) */}
            {selectedOrder && (
              <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6">
                <div className="flex items-start justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                        {selectedOrder.orderNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 font-mono">
                        {payLabels[selectedOrder.paymentStatus]}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {selectedOrder.customerName} · {selectedOrder.customerPhone} · {selectedOrder.customerEmail}
                    </div>
                  </div>

                  {/* Print Job Ticket Button */}
                  <button
                    onClick={() => setActiveJobTicketOrder(selectedOrder)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <PrintIcon className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
                    <span>Job Ticket</span>
                  </button>
                </div>

                {/* Payment review: the customer's bank-transfer screenshot */}
                <div className="p-4 rounded-xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">Payment review</span>
                    <span className="text-neutral-500">
                      Order total: <strong className="font-mono">{selectedOrder.totalGel.toFixed(2)} ₾</strong>
                    </span>
                  </div>

                  {selectedOrder.paymentProofs.length === 0 ? (
                    <p className="text-xs text-neutral-500">
                      {selectedOrder.paymentStatus === 'awaiting_quote'
                        ? 'Custom print: set the final price below. The customer can pay after that.'
                        : 'No screenshot uploaded yet.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedOrder.paymentProofs.map((proof) => (
                        <button
                          key={proof.id}
                          onClick={() => setZoomProof(proof)}
                          className="text-left rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden hover:border-amber-500 cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proof.thumbUrl}
                            alt="Payment screenshot"
                            className="w-full h-28 object-cover bg-neutral-100 dark:bg-neutral-800"
                          />
                          <div className="p-2 text-[10px] font-mono">
                            <div
                              className={`font-bold ${
                                proof.status === 'APPROVED'
                                  ? 'text-emerald-600'
                                  : proof.status === 'REJECTED'
                                  ? 'text-red-600'
                                  : proof.status === 'PENDING'
                                  ? 'text-amber-600'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {proof.status}
                            </div>
                            <div className="text-neutral-500">{new Date(proof.uploadedAt).toLocaleString()}</div>
                            {proof.amountClaimedGel != null && <div>Claimed: {proof.amountClaimedGel} ₾</div>}
                            {proof.payerName && <div>Payer: {proof.payerName}</div>}
                            {proof.rejectReason && <div className="text-red-600 whitespace-normal">{proof.rejectReason}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedOrder.paymentStatus === 'proof_submitted' && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reject reason (required to reject), e.g. amount does not match"
                        className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={reviewBusy}
                          onClick={async () => {
                            setReviewBusy(true);
                            try {
                              await onReviewPayment(selectedOrder.id, { action: 'approve' });
                              setRejectReason('');
                            } finally {
                              setReviewBusy(false);
                            }
                          }}
                          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                        >
                          Approve payment
                        </button>
                        <button
                          disabled={reviewBusy || rejectReason.trim().length < 3}
                          onClick={async () => {
                            setReviewBusy(true);
                            try {
                              await onReviewPayment(selectedOrder.id, { action: 'reject', reason: rejectReason.trim() });
                              setRejectReason('');
                            } finally {
                              setReviewBusy(false);
                            }
                          }}
                          className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Progression Controls (Section 5.5) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    {t.actionAdvanceStatus}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                    {(
                      [
                        'awaiting_payment',
                        'awaiting_review',
                        'confirmed',
                        'preparation',
                        'printing',
                        'ready',
                        'awaiting_courier',
                        'shipped',
                        'cancelled',
                      ] as OrderStatus[]
                    ).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleAdvanceStatus(st)}
                        className={`py-2 px-2.5 rounded-lg border text-center font-medium capitalize transition-all cursor-pointer ${
                          selectedOrder.status === st
                            ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Operator note for status change */}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={statusNoteInput}
                      onChange={(e) => setStatusNoteInput(e.target.value)}
                      placeholder="Add operator note (e.g. Watertight check passed, Bed level verified)..."
                      className="flex-1 p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800"
                    />
                  </div>
                </div>

                {/* Price Adjustment / Correction (Section 5.3) */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">
                      {t.actionAdjustPrice}
                    </span>
                    <span className="text-neutral-500">
                      Current: {selectedOrder.totalGel} GEL{selectedOrder.paymentStatus === 'verified' ? ' (locked: payment verified)' : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={priceEditInput || selectedOrder.totalGel}
                      onChange={(e) => setPriceEditInput(parseFloat(e.target.value))}
                      className="w-32 p-2 text-xs font-mono font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                    <button
                      onClick={handlePriceUpdate}
                      className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Apply New Quote
                    </button>
                  </div>
                </div>

                {/* Order Items Inspection */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    Configured Production Items
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((it) => (
                      <div
                        key={it.cartItemId}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs"
                      >
                        <div className="flex justify-between font-bold">
                          <span>{it.title}</span>
                          <span className="font-mono">{it.totalPriceGel.toFixed(2)} ₾</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono mt-1">
                          Material: {it.config.material} · Color: {it.config.colorName} · Layer: {it.config.layerHeight}mm · Infill: {it.config.infillPercent}% · Qty: {it.config.quantity}
                        </div>
                        {it.modelRef && it.modelRef.startsWith('http') && (
                          <a
                            href={it.modelRef}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            3D model: {new URL(it.modelRef).hostname.replace('www.', '')} ↗
                          </a>
                        )}
                        {it.geometry?.bounds && (
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            Bounding box: {it.geometry.bounds.x} × {it.geometry.bounds.y} × {it.geometry.bounds.z} mm
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PRINTER FLEET TAB (Section 5.4 & 5.5) */}
        {activeTab === 'printers' && (
          <div className="mt-8 space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {printers.map((prn) => (
                <div
                  key={prn.id}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold">{prn.name}</h4>
                      <p className="text-xs text-neutral-500 font-mono">{prn.model}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold uppercase ${
                        prn.status === 'printing'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {prn.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                    <div>
                      <span className="text-neutral-400 text-[10px] block">Build Volume</span>
                      <span>{prn.buildVolumeMm.x}×{prn.buildVolumeMm.y}×{prn.buildVolumeMm.z} mm</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] block">Total Run Hours</span>
                      <span>{prn.totalPrintHours}h</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-400 text-[10px] block">Supported Polymers</span>
                      <span>{prn.supportedMaterials.join(', ')}</span>
                    </div>
                  </div>

                  {prn.currentOrderId && (
                    <div className="text-xs border-t border-neutral-200 dark:border-neutral-800 pt-3">
                      <span className="text-neutral-500 block">Current Job:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {prn.currentOrderId} ({prn.currentProgressPercent}%)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. MATERIALS & WAREHOUSE INVENTORY TAB (Section 5.4) */}
        {activeTab === 'materials' && (
          <div className="mt-8 space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Filament Spools & Resin Tanks Warehouse
                </h3>
                <button
                  onClick={() => setShowSpoolForm((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showSpoolForm ? 'Close' : 'Add spool'}
                </button>
              </div>

              {showSpoolForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSpoolBusy(true);
                    const ok = await onAddMaterial({
                      type: spoolForm.type,
                      brand: spoolForm.brand,
                      colorName: spoolForm.colorName,
                      colorHex: spoolForm.colorHex,
                      diameterMm: Number(spoolForm.diameterMm),
                      totalWeightGrams: Number(spoolForm.totalWeightGrams),
                      remainingGrams: spoolForm.remainingGrams === '' ? undefined : Number(spoolForm.remainingGrams),
                      purchaseCostGel: Number(spoolForm.purchaseCostGel || 0),
                      minThresholdGrams: Number(spoolForm.minThresholdGrams || 0),
                      location: spoolForm.location,
                    });
                    setSpoolBusy(false);
                    if (ok) {
                      setSpoolForm(emptySpool);
                      setShowSpoolForm(false);
                    }
                  }}
                  className="mb-6 p-4 rounded-xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/10 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"
                >
                  {(
                    [
                      ['Material', 'type'],
                      ['Brand', 'brand'],
                      ['Color name', 'colorName'],
                      ['Color', 'colorHex'],
                      ['Spool weight (g)', 'totalWeightGrams'],
                      ['Remaining (g, empty = full)', 'remainingGrams'],
                      ['Diameter (mm)', 'diameterMm'],
                      ['Purchase cost (₾)', 'purchaseCostGel'],
                      ['Low-stock alert (g)', 'minThresholdGrams'],
                      ['Location (e.g. Rack A1)', 'location'],
                    ] as const
                  ).map(([label, key]) => (
                    <label key={key} className="block">
                      <span className="block font-medium mb-1">{label}</span>
                      {key === 'type' ? (
                        <select
                          value={spoolForm.type}
                          onChange={(e) => setSpoolForm({ ...spoolForm, type: e.target.value as PrintMaterialType })}
                          className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        >
                          {['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Resin'].map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      ) : key === 'colorHex' ? (
                        <input
                          type="color"
                          value={spoolForm.colorHex}
                          onChange={(e) => setSpoolForm({ ...spoolForm, colorHex: e.target.value })}
                          className="w-full h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer"
                        />
                      ) : (
                        <input
                          required={key === 'brand' || key === 'colorName' || key === 'totalWeightGrams'}
                          type={['brand', 'colorName', 'location'].includes(key) ? 'text' : 'number'}
                          min={0}
                          step={key === 'diameterMm' || key === 'purchaseCostGel' ? '0.01' : '1'}
                          value={spoolForm[key]}
                          onChange={(e) => setSpoolForm({ ...spoolForm, [key]: e.target.value })}
                          className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        />
                      )}
                    </label>
                  ))}
                  <div className="col-span-2 md:col-span-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={spoolBusy}
                      className="px-5 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {spoolBusy ? 'Saving...' : 'Save spool'}
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="pb-3">Type & Brand</th>
                      <th className="pb-3">Color</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3">Remaining Grams</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {materials.map((m) => {
                      const isLow = m.remainingGrams <= m.minThresholdGrams;
                      const percent = Math.min(100, Math.round((m.remainingGrams / m.totalWeightGrams) * 100));

                      return (
                        <tr key={m.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                          <td className="py-3.5">
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {m.type}
                            </span>
                            <span className="text-neutral-400 ml-1.5 font-mono">({m.brand})</span>
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700"
                                style={{ backgroundColor: m.colorHex }}
                              />
                              <span>{m.colorName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono text-neutral-500">{m.location}</td>
                          <td className="py-3.5 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{m.remainingGrams} g</span>
                              <div className="w-16 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isLow ? 'bg-rose-500' : 'bg-amber-500'}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            {isLow ? (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                                Low Stock ({m.remainingGrams}g)
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                                Optimal
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => onUpdateMaterialSpool(m.id, m.totalWeightGrams)}
                                className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 font-mono text-[11px] cursor-pointer"
                                title="New spool: reset to full weight"
                              >
                                Refill
                              </button>
                              <button
                                onClick={() => {
                                  const v = window.prompt(
                                    'Grams to ADD to ' + m.type + ' ' + m.colorName + ' (currently ' + m.remainingGrams + ' g)',
                                    '1000'
                                  );
                                  if (v === null) return;
                                  const added = Math.round(Number(v));
                                  if (!Number.isFinite(added) || added <= 0) return alert('Enter a positive number of grams');
                                  onUpdateMaterialSpool(m.id, m.remainingGrams + added);
                                }}
                                className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 font-mono text-[11px] cursor-pointer"
                                title="Add grams to the current amount"
                              >
                                + Add g
                              </button>
                              <button
                                onClick={() => {
                                  const v = window.prompt(
                                    'Grams to SUBTRACT from ' + m.type + ' ' + m.colorName + ' (currently ' + m.remainingGrams + ' g)',
                                    '50'
                                  );
                                  if (v === null) return;
                                  const used = Math.round(Number(v));
                                  if (!Number.isFinite(used) || used <= 0) return alert('Enter a positive number of grams');
                                  onUpdateMaterialSpool(m.id, Math.max(0, m.remainingGrams - used));
                                }}
                                className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 font-mono text-[11px] cursor-pointer"
                                title="Subtract grams (print job usage, waste)"
                              >
                                - Use g
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Remove ' + m.type + ' ' + m.brand + ' / ' + m.colorName + '?')) {
                                    onDeleteMaterial(m.id);
                                  }
                                }}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 font-mono text-[11px] cursor-pointer"
                                title="Remove spool"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. AUDIT LOG TAB (Section 8 & 9) */}
        {activeTab === 'catalog' && <AdminCatalog />}

        {activeTab === 'audit' && (
          <div className="mt-8 space-y-4 animate-in fade-in duration-200">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">
                Immutable System Audit Trail
              </h3>
              <div className="space-y-3 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {log.action}
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-neutral-700 dark:text-neutral-300 font-semibold">
                          {log.entityId}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 font-sans">
                        {log.details}
                      </p>
                    </div>
                    <div className="text-[10px] text-neutral-400 text-right whitespace-nowrap">
                      <div>{log.userName}</div>
                      <div>{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

                {zoomProof && (
          <div
            className="fixed inset-0 z-[60] bg-neutral-950/85 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomProof(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomProof.imageUrl} alt="Payment screenshot" className="max-w-full max-h-full rounded-lg shadow-2xl" />
          </div>
        )}

        {/* Workshop Job Ticket Modal */}
        {activeJobTicketOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-white text-neutral-900 shadow-2xl space-y-4">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h3 className="text-lg font-black font-mono">
                    WORKSHOP PRINT TICKET #{activeJobTicketOrder.orderNumber}
                  </h3>
                  <div className="text-xs text-neutral-500">
                    Technopark Vake, Tbilisi Facility
                  </div>
                </div>
                <button
                  onClick={() => setActiveJobTicketOrder(null)}
                  className="text-xs font-bold px-2 py-1 bg-neutral-200 rounded cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="text-xs space-y-2 font-mono">
                <div><strong>Customer:</strong> {activeJobTicketOrder.customerName} ({activeJobTicketOrder.customerPhone})</div>
                <div><strong>Delivery:</strong> {activeJobTicketOrder.deliveryMethod.toUpperCase()} — {activeJobTicketOrder.deliveryAddress}</div>
                <div><strong>Assigned Hardware:</strong> {activeJobTicketOrder.assignedPrinterId || 'Bambu Lab X1-Carbon #01'}</div>
                <div><strong>Target Completion:</strong> {new Date(activeJobTicketOrder.estimatedCompletion).toLocaleString()}</div>
              </div>

              <div className="p-3 bg-neutral-100 rounded-lg text-xs space-y-1">
                <div className="font-bold">Part Checklist:</div>
                {activeJobTicketOrder.items.map((it, idx) => (
                  <div key={idx} className="font-mono text-[11px]">
                    [ ] {it.title} — {it.subtitle}{it.modelRef ? ` — ${it.modelRef}` : ''}
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-xs pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-bold cursor-pointer"
                >
                  Print Sheet
                </button>
                <button
                  onClick={() => setActiveJobTicketOrder(null)}
                  className="px-4 py-2 rounded-lg border font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
