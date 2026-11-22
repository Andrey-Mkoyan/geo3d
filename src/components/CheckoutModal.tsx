'use client';

import React, { useEffect, useState } from 'react';
import { BankAccount, CartItem, Language, PublicSettings } from '../types';
import { translations } from '../i18n/translations';
import { paymentText } from '../i18n/payment';
import { shellText } from '../i18n/shell';
import { X, CheckCircle2, ShieldCheck, Truck, Building2, Tag, Mail, MessageSquare, Clock } from 'lucide-react';
import { BankDetails } from './BankDetails';
import { PaymentProofUploader } from './PaymentProofUploader';

export interface CreatedOrder {
  orderNumber: string;
  trackingToken: string;
  trackingUrl: string;
  totalGel: number;
  paymentStatus: string;
  requiresQuote: boolean;
  bankAccounts: BankAccount[];
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  language: Language;
  settings: PublicSettings;
  /** Order was created on the server (cart should be cleared) */
  onOrderCreated: (order: CreatedOrder) => void;
  /** Customer wants to open the private tracking page */
  onTrack: (token: string) => void;
}

type DeliveryMethod = 'tbilisi_courier' | 'regional_courier' | 'self_pickup';

interface ServerQuote {
  subtotalGel: number;
  deliveryGel: number;
  discountGel: number;
  totalGel: number;
  promoCode: string | null;
  requiresQuote: boolean;
}

/** Parses a JSON response; a crashed server returns an HTML error page, which must not blow up the UI. */
const readJson = (res: Response) => res.json().catch(() => ({} as Record<string, any>));

/** Cart item -> the minimal payload the server needs. The server recomputes every price. */
const toPayloadItem = (i: CartItem) => ({
  type: i.type,
  productId: i.productId,
  title: i.title,
  subtitle: i.subtitle,
  config: {
    material: i.config.material,
    colorName: i.config.colorName,
    colorHex: i.config.colorHex,
    layerHeight: i.config.layerHeight,
    infillPercent: i.config.infillPercent,
    scalePercent: i.config.scalePercent,
    quantity: i.config.quantity,
    smoothVapor: i.config.smoothVapor,
    brassInserts: i.config.brassInserts,
    userNotes: i.config.userNotes || undefined,
  },
  geometry:
    i.type === 'custom_file' && i.geometry
      ? {
          fileName: i.geometry.fileName,
          volumeCm3: i.geometry.volumeCm3,
          triangles: i.geometry.triangles,
          bounds: i.geometry.bounds,
          isSample: i.geometry.isSample,
        }
      : undefined,
});

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  language,
  settings,
  onOrderCreated,
  onTrack,
}) => {
  const t = translations[language];
  const p = paymentText[language];
  const s = shellText[language];

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredContact, setPreferredContact] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Tbilisi');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('tbilisi_courier');

  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState<string | undefined>(undefined);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [quote, setQuote] = useState<ServerQuote | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [uploaded, setUploaded] = useState(false);

  // Authoritative totals come from the server (delivery fee + promo + pricing)
  const itemsKey = JSON.stringify(items.map((i) => [i.type, i.productId, i.config, i.geometry?.volumeCm3]));
  useEffect(() => {
    if (!isOpen || created || items.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/orders/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items.map(toPayloadItem), deliveryMethod, promoCode }),
        });
        const body = await readJson(res);
        if (cancelled) return;
        if (!res.ok) {
          if (body.code === 'BAD_PROMO') {
            setPromoCode(undefined);
            setPromoError(p.promoInvalid);
          } else {
            setError(body.error || p.genericError);
          }
          return;
        }
        setError(null);
        setQuote(body);
      } catch {
        if (!cancelled) setError(p.genericError);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemsKey, deliveryMethod, promoCode, created]);

  // Esc closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.totalPriceGel, 0);
  const deliveryFee = quote?.deliveryGel ?? settings.deliveryFees[deliveryMethod];
  const discount = quote?.discountGel ?? 0;
  const total = quote?.totalGel ?? Math.max(0, subtotal + deliveryFee);
  const requiresQuote = quote?.requiresQuote ?? items.some((i) => i.requiresReview || i.type === 'custom_file');

  const handleApplyPromo = () => {
    setPromoError(null);
    if (promoInput.trim()) setPromoCode(promoInput.trim());
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(toPayloadItem),
          deliveryMethod,
          promoCode,
          customerName: fullName,
          customerPhone: phone,
          customerEmail: email,
          preferredContact,
          locale: language,
          city: deliveryMethod === 'self_pickup' ? '' : city,
          deliveryAddress: deliveryMethod === 'self_pickup' ? '' : address,
          customerNotes: notes || undefined,
          website: honeypot,
        }),
      });
      const body = await readJson(res);
      if (!res.ok) throw new Error(body.issues?.[0]?.message ? `${body.issues[0].path}: ${body.issues[0].message}` : body.error);
      setCreated(body);
      onOrderCreated(body);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : p.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryOption = (id: DeliveryMethod, label: string, icon: React.ReactNode) => {
    const fee = settings.deliveryFees[id];
    return (
      <label
        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
          deliveryMethod === id
            ? 'border-amber-500 bg-amber-500/5 text-neutral-900 dark:text-white'
            : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <input
            type="radio"
            name="delivery"
            checked={deliveryMethod === id}
            onChange={() => setDeliveryMethod(id)}
            className="accent-amber-500"
          />
          {icon}
          <span>{label}</span>
        </div>
        <span className={`font-mono font-bold ${fee === 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{fee} ₾</span>
      </label>
    );
  };

  const inputCls =
    'w-full p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl text-neutral-900 dark:text-neutral-100 p-6 sm:p-8">
        <button
          onClick={onClose}
          aria-label={s.close}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {created ? (
          /* Step 2: order placed -> pay by bank transfer and upload the screenshot */
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold">{p.orderCreated}</h3>
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 max-w-sm mx-auto text-left">
                <div className="text-xs text-neutral-500 uppercase tracking-wider">{t.orderNumberLabel}</div>
                <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                  {created.orderNumber}
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  {t.total}:{' '}
                  <span className="font-bold text-neutral-900 dark:text-white">{created.totalGel.toFixed(2)} ₾</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">{p.saveLink}</p>
            </div>

            {created.requiresQuote ? (
              <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-sm flex gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <span>{p.quotePending}</span>
              </div>
            ) : (
              <>
                <BankDetails
                  accounts={created.bankAccounts}
                  amountGel={created.totalGel}
                  orderNumber={created.orderNumber}
                  language={language}
                />
                <PaymentProofUploader
                  token={created.trackingToken}
                  language={language}
                  onUploaded={() => setUploaded(true)}
                />
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={() => onTrack(created.trackingToken)}
                className="flex-1 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                {p.trackOrder}
              </button>
              {!uploaded && !created.requiresQuote && (
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {p.uploadLater}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Step 1: checkout form */
          <form onSubmit={handlePlaceOrder} className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <span>{s.checkoutKicker}</span>
                <span aria-hidden="true">·</span>
                <span>{s.checkoutKicker2}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5">{t.checkoutTitle}</h2>
            </div>

            {/* Honeypot: real users never see or fill this */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            {/* 1. Contact */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                1. {t.customerInfo}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium mb-1">{t.fullName} *</label>
                  <input type="text" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block font-medium mb-1">{t.phone} *</label>
                  <input type="tel" required minLength={6} placeholder="+995 5XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">{t.email} *</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">{p.contactPref}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['EMAIL', p.viaEmail, <Mail key="e" className="w-3.5 h-3.5" />],
                        ['SMS', p.viaSms, <MessageSquare key="s" className="w-3.5 h-3.5" />],
                      ] as const
                    ).map(([id, label, icon]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPreferredContact(id)}
                        className={`p-2.5 rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          preferredContact === id
                            ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300'
                            : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Delivery */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                2. {t.deliveryMethodTitle}
              </h3>
              <div className="space-y-2 text-xs">
                {deliveryOption('tbilisi_courier', t.deliveryTbilisi, <Truck className="w-4 h-4 text-amber-500" />)}
                {deliveryOption('regional_courier', t.deliveryRegional, <Truck className="w-4 h-4 text-amber-500" />)}
                {deliveryOption('self_pickup', t.deliveryPickup, <Building2 className="w-4 h-4 text-amber-500" />)}
              </div>

              {deliveryMethod !== 'self_pickup' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="block font-medium mb-1">{s.city} *</label>
                    <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium mb-1">{t.addressLabel} *</label>
                    <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}
              <div className="text-xs">
                <label className="block font-medium mb-1">{p.orderNotes}</label>
                <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* 3. Payment info (no card payments) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                3. {p.bankTitle}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                {requiresQuote ? p.quotePending : p.uploadHint}
              </p>
            </div>

            {/* Promo */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.promoCodeLabel}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="flex-1 p-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-4 py-2.5 rounded-lg bg-neutral-800 text-white text-xs font-semibold hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  {t.applyPromo}
                </button>
              </div>
              {promoError && <div className="text-xs text-red-600 dark:text-red-400">{promoError}</div>}
              {quote?.promoCode && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{quote.promoCode}</span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{t.subtotal}</span>
                <span>{(quote?.subtotalGel ?? subtotal).toFixed(2)} ₾</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{t.discount}</span>
                  <span>-{discount.toFixed(2)} ₾</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{t.deliveryCost}</span>
                <span>{deliveryFee.toFixed(2)} ₾</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between text-sm font-bold">
                <span>{t.total}</span>
                <span className="text-amber-600 dark:text-amber-400 font-extrabold tabular-nums">{total.toFixed(2)} ₾</span>
              </div>
            </div>

            {error && (
              <div className="text-xs font-medium text-red-600 dark:text-red-400 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{p.placing}</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {t.confirmOrderBtn} ({total.toFixed(2)} ₾)
                  </span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
