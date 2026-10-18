import { createContext, useContext, type ReactNode } from 'react'
import type { ShopRecord } from '../data/seeds'

/** The shop currently being viewed, provided by the shop route guard. */
export interface ShopContextValue {
  shop: ShopRecord
  shopId: string
  slug: string
}

const ShopContext = createContext<ShopContextValue | null>(null)

export function ShopProvider({ value, children }: { value: ShopContextValue; children: ReactNode }) {
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

/** The active shop, or null when not inside an `/:shopSlug` workspace. */
export function useShop(): ShopContextValue | null {
  return useContext(ShopContext)
}

/** The active shop id, or '' when outside a shop workspace. */
export function useShopId(): string {
  return useContext(ShopContext)?.shopId ?? ''
}
