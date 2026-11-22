import 'server-only';
import { db } from '../db';
import type { PublicSettings } from '../../types';

const DEFAULTS: PublicSettings = {
  bankAccounts: [
    { bank: 'Bank of Georgia', iban: 'GE00BG0000000000000000', recipient: 'Geo3D LLC' },
    { bank: 'TBC Bank', iban: 'GE00TB0000000000000000', recipient: 'Geo3D LLC' },
  ],
  deliveryFees: { tbilisi_courier: 10, regional_courier: 15, self_pickup: 0 },
  pickupAddress: 'Technopark Vake, Chavchavadze 37',
};

/** Public settings (bank accounts for transfers, delivery fees). Editable by admin via the Setting table. */
export async function getSettings(): Promise<PublicSettings> {
  const rows = await db.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    bankAccounts: (map.get('bankAccounts') as unknown as PublicSettings['bankAccounts']) ?? DEFAULTS.bankAccounts,
    deliveryFees: (map.get('deliveryFees') as unknown as PublicSettings['deliveryFees']) ?? DEFAULTS.deliveryFees,
    pickupAddress: (map.get('pickupAddress') as string) ?? DEFAULTS.pickupAddress,
  };
}

export const DEFAULT_SETTINGS = DEFAULTS;
