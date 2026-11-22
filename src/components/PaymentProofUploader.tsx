'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle2, ImageIcon } from 'lucide-react';
import type { Language } from '../types';
import { paymentText } from '../i18n/payment';

interface Props {
  token: string;
  language: Language;
  /** Called after the server accepted the screenshot */
  onUploaded: () => void;
  /** Hide the "success" panel (the parent shows its own) */
  compact?: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024;

export const PaymentProofUploader: React.FC<Props> = ({ token, language, onUploaded }) => {
  const p = paymentText[language];
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setError(p.badType);
    if (f.size > MAX_BYTES) return setError(p.tooLarge);
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (amount.trim()) fd.append('amountClaimedGel', amount.trim());
      if (payer.trim()) fd.append('payerName', payer.trim());
      const res = await fetch(`/api/track/${encodeURIComponent(token)}/payment-proof`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || p.genericError);
      }
      setDone(true);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : p.genericError);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-emerald-700 dark:text-emerald-300">{p.uploadedTitle}</div>
          <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">{p.uploadedNote}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div>
        <div className="text-sm font-bold text-neutral-900 dark:text-white">{p.uploadTitle}</div>
        <div className="text-neutral-500 mt-0.5">{p.uploadHint}</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0]);
        }}
        className="w-full rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-amber-500 transition-colors p-4 flex flex-col items-center gap-2 cursor-pointer"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-48 rounded-lg object-contain" />
        ) : (
          <ImageIcon className="w-8 h-8 text-neutral-400" />
        )}
        <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          {file ? p.changeFile : p.chooseFile}
        </span>
        {file && <span className="text-neutral-500 truncate max-w-full">{file.name}</span>}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={p.amountPaid}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800"
        />
        <input
          type="text"
          maxLength={120}
          placeholder={p.payerName}
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
          className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800"
        />
      </div>

      {error && <div className="text-red-600 dark:text-red-400 font-medium">{error}</div>}

      <button
        type="button"
        disabled={!file || busy}
        onClick={submit}
        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-sm transition-all cursor-pointer"
      >
        {busy ? p.uploading : p.sendProof}
      </button>
    </div>
  );
};
