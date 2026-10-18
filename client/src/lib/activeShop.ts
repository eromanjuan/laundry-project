/**
 * Module-level store for the shop currently being viewed.
 *
 * React components read the shop from `ShopContext`, but a few plain library
 * helpers (receipts, public tracking, push, payment proofs) are not hooks and
 * need the same id. The shop route guard (and the public track page) publish
 * the id here; every helper falls back to an empty string outside a shop.
 */
let activeShopId = ''

export function setActiveShopId(id: string | null | undefined): void {
  activeShopId = id ?? ''
}

export function getActiveShopId(): string {
  return activeShopId
}
