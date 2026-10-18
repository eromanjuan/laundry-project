import { useState, type FormEvent } from 'react'
import { FaUserShield, FaPlus, FaTrash, FaStar, FaInfoCircle, FaUserPlus } from 'react-icons/fa'
import { useAuth, type PlatformAdminRecord } from '../context/AuthContext'
import { MasterLayout } from '../components/MasterLayout'
import { PasswordPromptModal } from '../components/PasswordPromptModal'
import { MASTER_UID } from '../lib/tenant'

/**
 * Master console → Settings. Lets a platform administrator add, promote and
 * revoke other platform administrators.
 *
 * A platform administrator is either:
 *   - a dedicated "console" account (real Auth user, role `Master`), or
 *   - an existing shop account promoted in place (added to the `platformAdmins`
 *     allow-list; it keeps its shop role/profile).
 * Either way, rights come from the allow-list checked by `isMaster()` in the
 * Firestore rules — never from a client-supplied role.
 */
export function MasterSettingsPage() {
  const { platformAdmins, addPlatformAdmin, removePlatformAdmin, user } = useAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<PlatformAdminRecord | null>(null)

  const sorted = [...platformAdmins].sort((a, b) => {
    const rank = (u: PlatformAdminRecord) => (u.uid === MASTER_UID ? 0 : u.uid === user?.uid ? 1 : 2)
    return rank(a) - rank(b) || (a.name || '').localeCompare(b.name || '')
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const result = await addPlatformAdmin({ name, username, email, password })
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotice(
      result.mode === 'promoted'
        ? `${email.trim()} now has platform administrator access — their existing shop account and role are unchanged.`
        : `${name.trim() || email.trim()} was added as a platform administrator. They set their own password on first sign-in.`,
    )
    setName('')
    setUsername('')
    setEmail('')
    setPassword('')
  }

  const confirmRemove = async (adminPassword: string) => {
    if (!pendingRemove) return null
    const result = await removePlatformAdmin(pendingRemove, adminPassword)
    if (result) return result
    setNotice(
      pendingRemove.promoted
        ? `${pendingRemove.name || pendingRemove.email} no longer has platform administrator access. Their shop account is untouched.`
        : `${pendingRemove.name || pendingRemove.email} no longer has platform access.`,
    )
    return null
  }

  return (
    <MasterLayout>
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FaUserShield />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Platform administrators</h2>
            <p className="text-sm text-slate-500">
              Accounts that can sign in to the Master Console and administer every shop.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {sorted.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No platform administrators found.</p>
          ) : (
            sorted.map((admin) => {
              const isPrimary = admin.uid === MASTER_UID
              const isSelf = admin.uid === user?.uid
              const locked = isPrimary || isSelf
              return (
                <div
                  key={admin._docId ?? admin.uid}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold uppercase text-white">
                      {(admin.name || admin.email || '?').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{admin.name || admin.email}</p>
                        {isPrimary ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            <FaStar className="text-[10px]" /> Primary
                          </span>
                        ) : null}
                        {admin.promoted ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                            Promoted shop account
                          </span>
                        ) : null}
                        {isSelf && !isPrimary ? (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">You</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {admin.email}
                        {admin.username ? <span className="text-slate-400"> · @{admin.username}</span> : null}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={locked}
                    onClick={() => setPendingRemove(admin)}
                    title={
                      isPrimary
                        ? 'The primary administrator cannot be removed.'
                        : isSelf
                          ? 'You cannot remove yourself.'
                          : undefined
                    }
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                  >
                    <FaTrash /> {admin.promoted ? 'Revoke' : 'Remove'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FaUserPlus />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add or promote a platform administrator</h2>
            <p className="text-sm text-slate-500">
              Enter an email that already has an account (e.g. a shop owner) to promote it, or fill in all fields to
              create a new console account.
            </p>
          </div>
        </div>

        <form className="grid gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <span className="block text-xs text-slate-400">
              If this email already belongs to a shop account, it is promoted in place — the fields below are ignored.
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">Full Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Maria Santos"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. co-owner"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Temporary Password (new accounts only)</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          {error ? (
            <p className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600">{error}</p>
          ) : null}
          {notice ? (
            <p className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{notice}</p>
          ) : null}

          <div className="sm:col-span-2">
            <button
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              <FaPlus /> {busy ? 'Working…' : 'Add / Promote'}
            </button>
          </div>
        </form>

        <div className="flex items-start gap-2 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          <FaInfoCircle className="mt-0.5 shrink-0 text-slate-400" />
          <p>
            Revoking a dedicated console account disables its access immediately; on the Spark plan the underlying
            sign-in is left inert rather than fully deleted (that needs a server-side Admin SDK). Revoking a promoted
            shop account only removes platform access — the shop login keeps working.
          </p>
        </div>
      </section>

      <PasswordPromptModal
        isOpen={Boolean(pendingRemove)}
        title={pendingRemove?.promoted ? 'Revoke platform administrator' : 'Remove platform administrator'}
        message={
          pendingRemove
            ? `${
                pendingRemove.promoted ? 'Revoke' : 'Remove'
              } ${pendingRemove.name || pendingRemove.email} (${pendingRemove.email})? Enter your password to confirm — they lose Master Console access immediately.`
            : ''
        }
        confirmLabel="Confirm"
        onClose={() => setPendingRemove(null)}
        onSubmit={confirmRemove}
      />
    </MasterLayout>
  )
}
