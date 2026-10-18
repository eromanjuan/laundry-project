/**
 * Multi-tenant constants and path helpers.
 *
 * The platform is a single Firebase project shared by many independent laundry
 * shops. Every tenant record carries a `shopId`; per-shop configuration lives
 * under the `shops/{shopId}/settings` subcollection. Ownership is enforced in
 * `firestore.rules` — never trust the URL or a client-side role.
 */

import type { ShopRecord } from '../data/seeds'

/** Synthetic shop used when Firebase is not configured (local dev). */
export const DEV_SHOP: ShopRecord = {
  id: 'dev-shop',
  name: 'Dev Laundry',
  slug: 'dev',
  ownerUid: 'u1',
  ownerName: 'Dev Owner',
  ownerEmail: 'admin@laundrypos.com',
  contact: '',
  address: '',
  location: 'Local',
  status: 'active',
  createdAt: 0,
}

/**
 * The platform master account. This uid is also allow-listed in
 * `firestore.rules` (the only account permitted to create the `role: "master"`
 * profile). It is a stable identifier, not an email, so it can't be spoofed by
 * registering a look-alike address.
 */
export const MASTER_UID = '3NkY5cfPGhNYXfW4EukNDaOrEjz2'
export const MASTER_EMAIL = 'eugenioiromanjuan@gmail.com'

/** Is this profile the platform master administrator? */
export function isMasterProfile(profile: { role?: string } | null | undefined): boolean {
  return profile?.role === 'Master'
}

/** Top-level collections that hold shop-scoped (tenant) records. */
export const TENANT_COLLECTIONS = [
  'customers',
  'orders',
  'claims',
  'payments',
  'expenses',
  'cashPayments',
  'collections',
  'machines',
  'activity',
  'paymentProofs',
] as const

export type TenantCollection = (typeof TENANT_COLLECTIONS)[number]

/** Keys stored under `shops/{shopId}/settings/{key}`. */
export type ShopSettingKey =
  | 'pricing'
  | 'business'
  | 'branding'
  | 'payment'
  | 'lgConnection'
  | 'lgStatus'
  | 'lgToken'

/** Document path for a shop's settings document. */
export function shopSettingsPath(shopId: string, key: ShopSettingKey): [string, string, string, string, string] {
  return ['shops', shopId, 'settings', key] as unknown as [string, string, string, string, string]
}

/** Namespaced public tracking / proof / push key: `${shopId}_${jobKey}`. */
export function namespacedKey(shopId: string, jobKey: string): string {
  return `${shopId}_${jobKey}`
}
