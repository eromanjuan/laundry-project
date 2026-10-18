import { Link } from 'react-router-dom'
import { FaStore, FaArrowLeft, FaUserPlus } from 'react-icons/fa'

/** Shown when a `/:shopSlug` does not resolve to a registered shop. */
export function ShopNotFoundPage({ slug }: { slug?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e0ecff,_#f8fafc_45%,_#eef2ff)] px-4 py-10">
      <div className="w-full max-w-lg rounded-[32px] border border-white/60 bg-white p-8 text-center shadow-[0_40px_120px_-40px_rgba(37,99,235,0.45)] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
          <FaStore />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900">Shop not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          There is no laundry shop at <span className="font-mono text-slate-800">/{slug}</span>. Check the address, or
          register a new shop.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FaArrowLeft /> Back to sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <FaUserPlus /> Register a shop
          </Link>
        </div>
      </div>
    </div>
  )
}
