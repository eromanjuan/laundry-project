/**
 * Pricing configuration for job orders. Stored as a single Firestore document
 * (`settings/pricing`) and edited from Settings → Pricing. Falls back to these
 * defaults when Firebase isn't configured or the doc doesn't exist yet.
 *
 * Model: PER LOAD. A load holds up to `minLoadKg` (7 kg). Loads for an order are
 * `ceil(weight / minLoadKg)` (minimum 1). Each service has a flat price per load,
 * so the service charge is `sum(selected service prices) * loads`. Add-ons are
 * flat fees added once. `pricePerKilo` is an optional surcharge per kg (default 0).
 */
export interface PriceItem {
  name: string
  price: number
}

/**
 * A laundry load category. Two pricing modes:
 *  - 'per-load': loads = ceil(weight / kgPerLoad); charge = service price × loads
 *    (+ optional pricePerKilo surcharge on the weight).
 *  - 'per-kilo': charge = max(weight, minKg) × pricePerKilo (the base ₱/kg rate),
 *    e.g. ₱35/kg with a 5 kg minimum → 3 kg still bills as 5 kg = ₱175.
 */
export interface LoadType {
  name: string
  mode: 'per-load' | 'per-kilo'
  kgPerLoad: number
  /** Per-load: optional surcharge ₱/kg. Per-kilo: the base rate ₱/kg. */
  pricePerKilo: number
  /** Per-kilo minimum billable weight. */
  minKg: number
}

export interface PricingConfig {
  minLoadKg: number
  pricePerKilo: number
  /** Load categories with different machine capacities (see the washer load guide). */
  loadTypes: LoadType[]
  services: PriceItem[]
  addOns: PriceItem[]
  /** Retail products the shop sells alongside laundry (detergent, hangers, etc.). */
  products: PriceItem[]
  /** Loyalty points a registered customer earns per paid job order. */
  pointsPerOrder: number
  /** Peso value of one loyalty point when redeemed (legacy — kept for compatibility). */
  pesoPerPoint: number
  /** How many points equal ₱1 when redeemed (e.g. 20 → 20 pts = ₱1). */
  pointsPerPeso: number
}

export const defaultPricing: PricingConfig = {
  minLoadKg: 7,
  pricePerKilo: 0,
  loadTypes: [
    { name: 'Light clothes', mode: 'per-load', kgPerLoad: 7, pricePerKilo: 0, minKg: 0 },
    { name: 'Mixed light & heavy', mode: 'per-load', kgPerLoad: 6, pricePerKilo: 0, minKg: 0 },
    { name: 'Linens', mode: 'per-load', kgPerLoad: 5, pricePerKilo: 0, minKg: 0 },
    { name: 'Heavy linens', mode: 'per-load', kgPerLoad: 4.5, pricePerKilo: 0, minKg: 0 },
    { name: 'Per Kilo (₱35/kg, min 5kg)', mode: 'per-kilo', kgPerLoad: 7, pricePerKilo: 35, minKg: 5 },
  ],
  pointsPerOrder: 10,
  pesoPerPoint: 1,
  pointsPerPeso: 20,
  services: [
    { name: 'Wash & Fold', price: 170 },
    { name: 'Wash & Dry', price: 190 },
    { name: 'Dry Only', price: 80 },
    { name: 'Wash Only', price: 90 },
    { name: 'Comforter', price: 250 },
    { name: 'Spin only', price: 50 },
    { name: 'Rinse & Spin', price: 60 },
    { name: 'Spot Treatment', price: 40 },
    { name: 'Soaking', price: 30 },
  ],
  addOns: [
    { name: 'Pickup', price: 30 },
    { name: 'Delivery', price: 30 },
    { name: 'Hanger', price: 15 },
    { name: 'Perfume', price: 20 },
  ],
  products: [
    { name: 'Detergent (sachet)', price: 15 },
    { name: 'Fabric Conditioner', price: 15 },
    { name: 'Laundry Bag', price: 45 },
    { name: 'Bleach', price: 20 },
  ],
}

/** Loads required for a weight, honoring the per-machine minimum load. */
export function loadsForWeight(weightKg: number, minLoadKg: number) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0
  return Math.max(1, Math.ceil(weightKg / (minLoadKg || 7)))
}

export function priceOf(items: PriceItem[], name: string) {
  return items.find((item) => item.name === name)?.price ?? 0
}
