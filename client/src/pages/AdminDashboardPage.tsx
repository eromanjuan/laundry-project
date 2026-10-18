import { useMemo, useState } from 'react'
import { FaCheck, FaBan, FaTimesCircle, FaUndo, FaStore, FaClock, FaSearch, FaUserShield, FaShieldAlt } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { MasterLayout } from '../components/MasterLayout'
import type { ShopRecord } from '../data/seeds'

const STATUS_STYLES: Record<ShopRecord['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-rose-100 text-rose-800',
  rejected: 'bg-slate-200 text-slate-700',
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof FaStore; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg ${tone}`}>
        <Icon />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
    </div>
  )
}

/** Platform-wide master console: review and manage every registered shop. */
export function AdminDashboardPage() {
  const { allShops, setShopStatus, platformAdmins, addPlatformAdmin } = useAuth()
  const [rejecting, setRejecting] = useState<ShopRecord | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [promoting, setPromoting] = useState<ShopRecord | null>(null)
  const [promoteBusy, setPromoteBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const counts = useMemo(
    () => ({
      total: allShops.length,
      pending: allShops.filter((s) => s.status === 'pending').length,
      active: allShops.filter((s) => s.status === 'active').length,
      blocked: allShops.filter((s) => s.status === 'suspended' || s.status === 'rejected').length,
    }),
    [allShops],
  )

  const sorted = useMemo(() => {
    const rank: Record<ShopRecord['status'], number> = { pending: 0, active: 1, suspended: 2, rejected: 3 }
    return [...allShops].sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt - a.createdAt)
  }, [allShops])

  // Client-side shop search across the fields a master scans most often.
  const term = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!term) return sorted
    return sorted.filter((shop) =>
      [shop.name, shop.slug, shop.ownerName, shop.ownerEmail, shop.location].some((value) =>
        (value ?? '').toLowerCase().includes(term),
      ),
    )
  }, [sorted, term])

  const act = async (shop: ShopRecord, status: ShopRecord['status'], note?: string) => {
    setBusyId(shop.id)
    try {
      await setShopStatus(shop.id, status, note)
    } finally {
      setBusyId(null)
    }
  }

  // A shop owner is already a platform administrator when their email
  // appears in the allow-list (primary master, dedicated console
  // account, or a previously promoted shop account).
  const ownerIsAdmin = (email?: string) =>
    Boolean(email) && platformAdmins.some((admin) => (admin.email || '').toLowerCase() === email!.toLowerCase())

  // One-click promotion: the owner already has an account, so this only
  // adds them to the `platformAdmins` allow-list — their shop role,
  // profile and username are left untouched.
  const confirmPromote = async () => {
    if (!promoting) return
    setPromoteBusy(true)
    setNotice('')
    setError('')
    const result = await addPlatformAdmin({
      name: promoting.ownerName,
      username: '',
      email: promoting.ownerEmail,
      password: '',
    })
    setPromoteBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotice(
      `${promoting.ownerName} (${promoting.ownerEmail}) now has platform administrator access — their shop account and role are unchanged.`,
    )
    setPromoting(null)
  }

  return (
    <MasterLayout>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered shops" value={counts.total} icon={FaStore} tone="bg-blue-50 text-blue-600" />
        <StatCard label="Awaiting approval" value={counts.pending} icon={FaClock} tone="bg-amber-50 text-amber-600" />
        <StatCard label="Active shops" value={counts.active} icon={FaCheck} tone="bg-emerald-50 text-emerald-600" />
        <StatCard label="Suspended / rejected" value={counts.blocked} icon={FaBan} tone="bg-rose-50 text-rose-600" />
      </section>

      {error ? (
        <p className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">{notice}</p>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Shops</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {term ? `${filtered.length} of ${sorted.length}` : `${sorted.length} total`}
            </span>
          </div>
          <div className="relative sm:w-80">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, slug, owner, or location…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            {term ? `No shops match “${search.trim()}”.` : 'No shops have registered yet.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((shop) => (
              <div key={shop.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{shop.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[shop.status]}`}>
                      {shop.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    <a
                      href={`/${shop.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-blue-600 hover:underline"
                    >
                      /{shop.slug}
                    </a>
                    {' · '}
                    {shop.ownerName} ({shop.ownerEmail})
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {shop.location || 'No location set'} · registered {new Date(shop.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ownerIsAdmin(shop.ownerEmail) ? (
                    <span
                      title="This shop's owner is a platform administrator (Master Console access)."
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-700"
                    >
                      <FaShieldAlt /> Platform admin
                    </span>
                  ) : (
                    <button
                      disabled={busyId === shop.id}
                      onClick={() => {
                        setNotice('')
                        setError('')
                        setPromoting(shop)
                      }}
                      title={`Promote ${shop.ownerName} to platform administrator — they keep their shop role and gain Master Console access to every shop.`}
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                    >
                      <FaUserShield /> Promote to master
                    </button>
                  )}
                  {shop.status !== 'active' ? (
                    <button
                      disabled={busyId === shop.id}
                      onClick={() => void act(shop, 'active')}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <FaCheck /> Approve
                    </button>
                  ) : null}
                  {shop.status === 'pending' ? (
                    <button
                      disabled={busyId === shop.id}
                      onClick={() => {
                        setRejecting(shop)
                        setReason('')
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <FaTimesCircle /> Reject
                    </button>
                  ) : null}
                  {shop.status === 'active' ? (
                    <button
                      disabled={busyId === shop.id}
                      onClick={() => void act(shop, 'suspended')}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      <FaBan /> Suspend
                    </button>
                  ) : null}
                  {shop.status === 'suspended' || shop.status === 'rejected' ? (
                    <button
                      disabled={busyId === shop.id}
                      onClick={() => void act(shop, 'active')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <FaUndo /> Reactivate
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject registration</h3>
            <p className="mt-2 text-sm text-slate-500">
              Rejecting <span className="font-semibold text-slate-700">{rejecting.name}</span>. The owner will see your
              reason when they sign in.
            </p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Reason (optional)"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRejecting(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void act(rejecting, 'rejected', reason)
                  setRejecting(null)
                }}
                className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Reject shop
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {promoting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Promote to platform administrator</h3>
            <p className="mt-2 text-sm text-slate-500">
              Promote{' '}
              <span className="font-semibold text-slate-700">
                {promoting.ownerName} ({promoting.ownerEmail})
              </span>
              ? They keep their shop role and profile, and gain full Master Console access to every
              shop — approve/reject/suspend shops and manage other platform administrators.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPromoting(null)}
                disabled={promoteBusy}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmPromote()}
                disabled={promoteBusy}
                className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {promoteBusy ? 'Promoting…' : 'Promote to master'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MasterLayout>
  )
}
