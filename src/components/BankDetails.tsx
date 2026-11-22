'use client';

import React, { useState } from 'react';
import { Building2, Copy, Check } from 'lucide-react';
import type { BankAccount, Language } from '../types';
import { paymentText, fmt } from '../i18n/payment';

interface Props {
  accounts: BankAccount[];
  amountGel: number;
  orderNumber: string;
  language: Language;
}

export const BankDetails: React.FC<Props> = ({ accounts, amountGel, orderNumber, language }) => {
  const p = paymentText[language];
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (iban: string) => {
    try {
      await navigator.clipboard.writeText(iban);
      setCopied(iban);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable: user can still select the text */
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
        <Building2 className="w-4 h-4 text-amber-500" />
        {p.bankTitle}
      </div>
      <p className="text-neutral-600 dark:text-neutral-400">
        {fmt(p.bankInstructions, { amount: amountGel.toFixed(2), order: orderNumber })}
      </p>
      <div className="space-y-2">
        {accounts.map((a) => (
          <div
            key={a.iban}
            className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50"
          >
            <div className="font-bold text-neutral-900 dark:text-white">{a.bank}</div>
            <div className="text-neutral-500 mt-0.5">
              {p.recipient}: {a.recipient}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <span className="font-mono font-semibold break-all">{a.iban}</span>
              <button
                type="button"
                onClick={() => copy(a.iban)}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 font-semibold cursor-pointer"
              >
                {copied === a.iban ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === a.iban ? p.copied : p.copy}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
