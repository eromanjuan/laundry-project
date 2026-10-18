import { FaClock, FaBan, FaTimesCircle, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import type { ShopRecord } from '../data/seeds'

const COPY: Record<string, { icon: typeof FaClock; title: string; body: string; tone: string }> = {
  pending: {
    icon: FaClock,
    title: 'Your shop is awaiting approval',
    body: 'A platform administrator is reviewing your registration. You will be able to use your workspace as soon as it is approved — no need to register again.',
    tone: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  suspended: {
    icon: FaBan,
    title: 'This shop is suspended',
    body: 'Access has been temporarily disabled by a platform administrator. Please contact support if you believe this is a mistake.',
    tone: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  rejected: {
    icon: FaTimesCircle,
    title: 'This registration was not approved',
    body: 'The platform administrator declined this shop application. You may contact support for details.',
    tone: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
}

/** Shown to a shop owner whose workspace is not (yet) active. */
export function PendingApprovalPage({ shop }: { shop: ShopRecord }) {
  const { logout, user } = useAuth()
  const copy = COPY[shop.status] ?? COPY.pending
  const Icon = copy.icon

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e0ecff,_#f8fafc_45%,_#eef2ff)] px-4 py-10">
      <div className="w-full max-w-xl rounded-[32px] border border-white/60 bg-white p-8 shadow-[0_40px_120px_-40px_rgba(37,99,235,0.45)] sm:p-10">
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${copy.tone}`}>
          <Icon />
          {shop.status.charAt(0).toUpperCase() + shop.status.slice(1)}
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.body}</p>

        <dl className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Shop</dt>
            <dd className="font-semibold text-slate-900">{shop.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Web address</dt>
            <dd className="font-mono text-slate-800">/{shop.slug}</dd>
          </div>
          {user?.email ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Signed in as</dt>
              <dd className="text-slate-800">{user.email}</dd>
            </div>
          ) : null}
          {shop.status === 'rejected' && shop.rejectedReason ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reason</dt>
              <dd className="text-right text-rose-700">{shop.rejectedReason}</dd>
            </div>
          ) : null}
        </dl>

        <button
          onClick={logout}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <FaSignOutAlt /> Sign out
        </button>
      </div>
    </div>
  )
}
