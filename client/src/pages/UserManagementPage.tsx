import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { FaEdit, FaLock, FaPlus, FaTrash, FaUserShield, FaBan, FaCheck, FaCamera } from 'react-icons/fa'
import { useAuth, type AuthUser, type UserRole } from '../context/AuthContext'
import { ConfirmModal } from '../components/ConfirmModal'
import { PasswordPromptModal } from '../components/PasswordPromptModal'
import { useCollection } from '../hooks/useCollection'
import { fileToResizedDataUrl } from '../hooks/useBranding'
import { seedActivity, nowStamp, type ActivityRecord } from '../data/seeds'

const roleOptions: UserRole[] = ['Administrator', 'Manager', 'Staff/Cashier']

export function UserManagementPage() {
  const { user: currentUser, users, addUser, updateUser, removeUser, sendReset } = useAuth()
  const { add: addActivity } = useCollection<ActivityRecord>('activity', seedActivity)
  const [selectedRole, setSelectedRole] = useState<UserRole>('Staff/Cashier')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [photo, setPhoto] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setPhoto(await fileToResizedDataUrl(file, 256))
    } catch {
      setFormError('Could not read that image.')
    }
    event.target.value = ''
  }
  const [pendingReset, setPendingReset] = useState<AuthUser | null>(null)
  const [resetNotice, setResetNotice] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AuthUser | null>(null)

  const adminsCount = useMemo(() => users.filter((user) => user.role === 'Administrator').length, [users])
  const activeUsers = useMemo(() => users.filter((user) => user.isActive).length, [users])

  const resetForm = () => {
    setName('')
    setUsername('')
    setEmail('')
    setPassword('')
    setPhoto('')
    setSelectedRole('Staff/Cashier')
    setEditingId(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')

    if (!name || !username || !email || (!editingId && !password)) {
      setFormError('Fill in name, username, email, and password.')
      return
    }
    if (!editingId && password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }

    if (editingId) {
      const existing = users.find((entry) => entry.id === editingId)
      if (existing) {
        // Email is tied to the auth account and can't be changed here.
        await updateUser(existing, { name, username, role: selectedRole, photo })
      }
    } else {
      const error = await addUser({
        id: `u${Date.now()}`,
        name,
        username,
        email,
        role: selectedRole,
        isActive: true,
        password,
        photo,
      })
      if (error) {
        setFormError(error)
        return
      }
    }

    resetForm()
  }

  const handleEdit = (user: AuthUser) => {
    setEditingId(user.id)
    setName(user.name)
    setUsername(user.username)
    setEmail(user.email)
    setSelectedRole(user.role)
    setPassword('')
    setPhoto(user.photo ?? '')
  }

  const toggleStatus = (user: AuthUser) => {
    void updateUser(user, { isActive: !user.isActive })
  }

  const confirmReset = () => {
    if (!pendingReset) return
    void sendReset(pendingReset)
    setResetNotice(`A password-reset link was emailed to ${pendingReset.email}. They can set a new password from that link.`)
  }

  // Verifies the current admin's password before deleting the target user, then logs it.
  const confirmDelete = async (enteredPassword: string): Promise<string | null> => {
    if (!pendingDelete) return 'No user selected.'
    const error = await removeUser(pendingDelete, enteredPassword)
    if (!error) {
      void addActivity({
        id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        action: `Deleted user ${pendingDelete.name} (${pendingDelete.username} · ${pendingDelete.role})`,
        user: currentUser?.name ?? 'Unknown',
        at: nowStamp(),
      })
    }
    return error
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">User Management</p>
            <h2 className="mt-2 text-3xl font-semibold">Manage team access and permissions</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Administrators can add new users, update roles, disable access, and reset passwords.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-blue-50">
            {activeUsers} Active Accounts
          </div>
        </div>
      </section>

      {resetNotice ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <span>{resetNotice}</span>
          <button onClick={() => setResetNotice(null)} className="rounded-lg px-2 py-1 text-xs transition hover:bg-white/60">Dismiss</button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FaUserShield className="text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Create or Update Account</h3>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                {photo ? <img src={photo} alt="Profile" className="h-full w-full object-cover" /> : <FaCamera />}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {photo ? <button type="button" onClick={() => setPhoto('')} className="text-xs font-semibold text-rose-600">Remove</button> : null}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Full Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Email Address {editingId ? <span className="text-xs text-slate-400">(can't change)</span> : null}</span>
              <input type="email" value={email} disabled={Boolean(editingId)} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none disabled:bg-slate-100 disabled:text-slate-400" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Role</span>
              <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as UserRole)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none">
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            {!editingId ? (
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Password <span className="text-xs text-slate-400">(min 6 chars)</span></span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
              </label>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">To change a password, use <span className="font-semibold">Reset</span> on the account — it emails a secure reset link.</p>
            )}
            {formError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{formError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><FaPlus /> {editingId ? 'Update User' : 'Add User'}</button>
              <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Clear</button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Accounts</h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{adminsCount} Admins</span>
          </div>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700 ring-1 ring-slate-200">
                      {user.photo ? <img src={user.photo} alt={user.name} className="h-full w-full object-cover" /> : user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.username} • {user.email}</p>
                      <p className="mt-1 text-sm text-slate-600">Role: {user.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleEdit(user)} title="Edit" aria-label="Edit" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-100"><FaEdit /></button>
                    <button onClick={() => toggleStatus(user)} title={user.isActive ? 'Disable' : 'Enable'} aria-label={user.isActive ? 'Disable' : 'Enable'} className={`rounded-xl p-2.5 transition ${user.isActive ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}>
                      {user.isActive ? <FaBan /> : <FaCheck />}
                    </button>
                    <button onClick={() => setPendingReset(user)} title="Reset password" aria-label="Reset password" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-100"><FaLock /></button>
                    {user.id !== currentUser?.id ? (
                      <button onClick={() => setPendingDelete(user)} title="Delete" aria-label="Delete" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-700 transition hover:bg-rose-100"><FaTrash /></button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingReset)}
        title="Reset password"
        message={
          pendingReset
            ? `Email a password-reset link to ${pendingReset.name} (${pendingReset.email})? They'll set a new password from that link.`
            : ''
        }
        confirmLabel="Send Reset Email"
        tone="primary"
        onConfirm={confirmReset}
        onClose={() => setPendingReset(null)}
      />

      <PasswordPromptModal
        isOpen={Boolean(pendingDelete)}
        title="Delete user"
        message={
          pendingDelete
            ? `Deleting ${pendingDelete.name} (${pendingDelete.role}). Enter your password to confirm — this cannot be undone.`
            : ''
        }
        confirmLabel="Delete User"
        onSubmit={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
