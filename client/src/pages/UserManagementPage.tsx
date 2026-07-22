import { useMemo, useState, type FormEvent } from 'react'
import { FaEdit, FaLock, FaPlus, FaUserShield } from 'react-icons/fa'
import { useAuth, type AuthUser, type UserRole } from '../context/AuthContext'

const roleOptions: UserRole[] = ['Administrator', 'Manager', 'Staff/Cashier']

export function UserManagementPage() {
  const { users, setUsers } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole>('Staff/Cashier')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const adminsCount = useMemo(() => users.filter((user) => user.role === 'Administrator').length, [users])
  const activeUsers = useMemo(() => users.filter((user) => user.isActive).length, [users])

  const resetForm = () => {
    setName('')
    setUsername('')
    setEmail('')
    setPassword('')
    setSelectedRole('Staff/Cashier')
    setEditingId(null)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!name || !username || !email || (!editingId && !password)) {
      return
    }

    const userPayload: AuthUser = {
      id: editingId ?? `u${Date.now()}`,
      name,
      username,
      email,
      role: selectedRole,
      isActive: true,
      password: password || 'temp123',
    }

    if (editingId) {
      setUsers((current) => current.map((user) => (user.id === editingId ? userPayload : user)))
    } else {
      setUsers((current) => [...current, userPayload])
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
  }

  const toggleStatus = (id: string) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, isActive: !user.isActive } : user)))
  }

  const resetPassword = (id: string) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, password: 'reset123' } : user)))
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

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FaUserShield className="text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Create or Update Account</h3>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Full Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Email Address</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Role</span>
              <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as UserRole)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none">
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
            </label>
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
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.username} • {user.email}</p>
                    <p className="mt-1 text-sm text-slate-600">Role: {user.role}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleEdit(user)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><FaEdit /> Edit</button>
                    <button onClick={() => toggleStatus(user.id)} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${user.isActive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => resetPassword(user.id)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><FaLock /> Reset</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
