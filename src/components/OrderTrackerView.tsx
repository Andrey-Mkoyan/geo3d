'use client';

import React, { useState } from 'react';
import { Order, OrderStatus, Language, BankAccount } from '../types';
import { paymentText, paymentStatusLabels, fmt } from '../i18n/payment';
import { BankDetails } from './BankDetails';
import { PaymentProofUploader } from './PaymentProofUploader';
import { translations } from '../i18n/translations';
import { contentText } from '../i18n/content';
import {
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  ShieldCheck,
  Package,
  Truck,
  Box,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface OrderTrackerViewProps {
  order: Order | null;
  language: Language;
  /** Private tracking token (needed to upload payment screenshots) */
  token: string;
  bankAccounts: BankAccount[];
  onRefresh: () => void;
}

const ORDER_STAGES: { status: OrderStatus; key: string }[] = [
  { status: 'awaiting_payment', key: '' },
  { status: 'awaiting_review', key: 'statusAwaitingReview' },
  { status: 'confirmed', key: 'statusConfirmed' },
  { status: 'preparation', key: 'statusPreparation' },
  { status: 'printing', key: 'statusPrinting' },
  { status: 'ready', key: 'statusReady' },
  { status: 'awaiting_courier', key: 'statusAwaitingCourier' },
  { status: 'shipped', key: 'statusShipped' },
];

export const OrderTrackerView: React.FC<OrderTrackerViewProps> = ({
  order,
  language,
  token,
  bankAccounts,
  onRefresh,
}) => {
  const t = translations[language];
  const p = paymentText[language];
  const c = contentText[language];
  const payLabels = paymentStatusLabels[language];
  const selectedOrder = order;

  const stageLabel = (status: OrderStatus) => {
    if (status === 'awaiting_payment') return payLabels.awaiting_payment;
    if (status === 'cancelled') return c.trkCancelled;
    const key = ORDER_STAGES.find((s) => s.status === status)?.key;
    return (key && t[key]) || status.replace(/_/g, ' ');
  };

  const currentStageIndex = selectedOrder ? ORDER_STAGES.findIndex((s) => s.status === selectedOrder.status) : -1;

  return (
    <section className="py-12 bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
            <span>{t.navTracking}</span>
            <span aria-hidden="true">·</span>
            <span>{c.trkPipelineTag}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            {t.trackerTitle}
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {t.trackerSubtitle}
          </p>

        </div>

        {/* Selected Order Display */}
        {selectedOrder ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Overview Banner Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold uppercase">
                    {stageLabel(selectedOrder.status)}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex flex-wrap gap-x-4">
                  <span>{c.trkCustomer}: <strong className="text-neutral-700 dark:text-neutral-300">{selectedOrder.customerName}</strong></span>
                  <span>{c.trkPlaced}: {new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                  <span>{c.trkDestination}: {selectedOrder.city}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wider">{t.estimatedReady}</div>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white">
                    {new Date(selectedOrder.estimatedCompletion).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {selectedOrder.assignedPrinterId && (
                  <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-left">
                    <span className="text-[10px] text-neutral-400 block font-mono">{c.trkHardware}</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedOrder.assignedPrinterId.replace('prn-', '').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Production Pipeline (Horizontal Stepper) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-6">
                {c.trkPipelineStatus}
              </h3>

              <div className="relative">
                {/* Connecting Progress Line */}
                <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-neutral-200 dark:bg-neutral-800 -translate-y-1/2 z-0" />
                <div
                  className="hidden lg:block absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 z-0 transition-all duration-500"
                  style={{
                    width: `${Math.max(0, (currentStageIndex / (ORDER_STAGES.length - 1)) * 100)}%`,
                  }}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-10 gap-4 relative z-10">
                  {ORDER_STAGES.map((stage, idx) => {
                    const isDone = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const isPending = idx > currentStageIndex;

                    return (
                      <div
                        key={stage.status}
                        className={`flex flex-col items-center text-center p-3 rounded-xl transition-all ${
                          isCurrent
                            ? 'bg-amber-500/10 border border-amber-500/30'
                            : 'bg-white dark:bg-neutral-900'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-colors ${
                            isDone
                              ? 'bg-amber-500 text-neutral-950'
                              : isCurrent
                              ? 'bg-amber-500 text-neutral-950 ring-4 ring-amber-500/20'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <span className="font-mono">{idx + 1}</span>
                          )}
                        </div>

                        <span
                          className={`text-[11px] font-semibold leading-tight ${
                            isCurrent
                              ? 'text-amber-600 dark:text-amber-400'
                              : isDone
                              ? 'text-neutral-900 dark:text-white'
                              : 'text-neutral-400 dark:text-neutral-500'
                          }`}
                        >
                          {stageLabel(stage.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payment (bank transfer + screenshot) */}
            {selectedOrder.status !== 'cancelled' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {p.paymentSection}
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                    {payLabels[selectedOrder.paymentStatus]}
                  </span>
                </div>

                {selectedOrder.paymentStatus === 'awaiting_quote' && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{p.quotePending}</p>
                )}

                {selectedOrder.paymentStatus === 'proof_submitted' && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{p.uploadedNote}</p>
                )}

                {selectedOrder.paymentStatus === 'verified' && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    {payLabels.verified} · {selectedOrder.totalGel.toFixed(2)} ₾
                  </p>
                )}

                {selectedOrder.paymentStatus === 'rejected' && (
                  <div className="p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm">
                    <div className="font-bold text-red-700 dark:text-red-300">{p.payRejected}</div>
                    {selectedOrder.paymentProofs.find((x) => x.status === 'REJECTED')?.rejectReason && (
                      <div className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
                        {p.payReason}: {selectedOrder.paymentProofs.find((x) => x.status === 'REJECTED')?.rejectReason}
                      </div>
                    )}
                  </div>
                )}

                {(selectedOrder.paymentStatus === 'awaiting_payment' || selectedOrder.paymentStatus === 'rejected') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BankDetails
                      accounts={bankAccounts}
                      amountGel={selectedOrder.totalGel}
                      orderNumber={selectedOrder.orderNumber}
                      language={language}
                    />
                    <PaymentProofUploader token={token} language={language} onUploaded={onRefresh} />
                  </div>
                )}
              </div>
            )}

            {/* Split Details: Left Order Items & Specs, Right Live Timeline Log */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Items in this Order (7 cols) */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {c.trkItemsTitle}
                </h3>

                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 flex items-start gap-3.5"
                    >
                      <div className="w-12 h-12 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Box className="w-6 h-6 text-amber-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                            {item.totalPriceGel.toFixed(2)} ₾
                          </span>
                        </div>

                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {item.subtitle}
                        </p>

                        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-mono p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                          <div>
                            <span className="text-neutral-400 block">{c.trkLayer}</span>
                            <span className="font-semibold">{item.config.layerHeight} mm</span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block">{c.trkInfill}</span>
                            <span className="font-semibold">{item.config.infillPercent}%</span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block">{c.trkMaterial}</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{item.config.material}</span>
                          </div>
                        </div>

                        {item.config.userNotes && (
                          <div className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                            "{item.config.userNotes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery & Payment Badges */}
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-neutral-400" />
                    <span>{selectedOrder.deliveryAddress}, {selectedOrder.city}</span>
                  </div>
                  <div className="font-mono font-bold text-neutral-900 dark:text-white">
                    {c.trkTotal}: {selectedOrder.totalGel.toFixed(2)} ₾ ({payLabels[selectedOrder.paymentStatus]})
                  </div>
                </div>
              </div>

              {/* Manufacturing Event Timeline (5 cols) */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {c.trkLogTitle}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">{c.trkLive}</span>
                </div>

                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
                  {selectedOrder.timeline.map((event, idx) => (
                    <div key={idx} className="relative flex items-start gap-3 pl-7">
                      <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-white dark:ring-neutral-900" />
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {event.status.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                          {event.note}
                        </p>
                        {event.operatorName && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
                            {fmt(c.trkSignedBy, { name: event.operatorName })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">{c.trkNotFound}</h3>
            <p className="text-xs text-neutral-500 mt-1">{p.lookupNotFound}</p>
          </div>
        )}
      </div>
    </section>
  );
};
