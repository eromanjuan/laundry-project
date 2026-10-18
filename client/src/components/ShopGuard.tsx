import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useShopBySlug } from '../hooks/useShopBySlug'
import { ShopProvider } from '../context/ShopContext'
import { setActiveShopId } from '../lib/activeShop'
import { ForcePasswordChange } from './ForcePasswordChange'
import { PendingApprovalPage } from '../pages/PendingApprovalPage'
import { ShopNotFoundPage } from '../pages/ShopNotFoundPage'
import { UnauthorizedPage } from '../pages/UnauthorizedPage'
import type { ShopRole } from '../data/seeds'

interface ShopGuardProps {
  children: ReactNode
  /** When set, only these shop roles (plus Administrator) may view the route. */
  allowedRoles?: ShopRole[]
}

function Loading({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
      {label}
    </div>
  )
}

/**
 * Resolves `/:shopSlug`, then verifies — server-enforced — that the signed-in
 * user is an active member of that exact shop before rendering its workspace.
 * Changing the URL can never reach another shop's data: the rules deny the
 * reads, and this guard also redirects to the user's own shop.
 */
export function ShopGuard({ children, allowedRoles }: ShopGuardProps) {
  const { shopSlug } = useParams()
  const { user, loading, isMaster, shop: myShop } = useAuth()
  const { shop, loading: shopLoading } = useShopBySlug(shopSlug)
  const location = useLocation()

  useEffect(() => {
    if (shop?.status === 'active') setActiveShopId(shop.id)
    return () => setActiveShopId('')
  }, [shop?.id, shop?.status])

  if (loading || shopLoading) return <Loading />

  if (!shop) return <ShopNotFoundPage slug={shopSlug} />

  if (!user) {
    return <Navigate to={`/login?shop=${shopSlug}`} replace state={{ from: location }} />
  }

  if (user.mustChangePassword) return <ForcePasswordChange />

  // The master (platform admin) may inspect any shop workspace.
  if (!isMaster) {
    // A member of a different shop must never land here.
    if (user.shopId !== shop.id) {
      const target = myShop?.slug ? `/${myShop.slug}/dashboard` : '/'
      return <Navigate to={target} replace />
    }

    if (shop.status !== 'active') return <PendingApprovalPage shop={shop} />

    if (allowedRoles && user.role !== 'Administrator' && !allowedRoles.includes(user.role as ShopRole)) {
      return <UnauthorizedPage />
    }
  }

  return <ShopProvider value={{ shop, shopId: shop.id, slug: shop.slug }}>{children}</ShopProvider>
}
