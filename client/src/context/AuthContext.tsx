import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'

export type UserRole = 'Administrator' | 'Manager' | 'Staff/Cashier'

export interface AuthUser {
  id: string
  name: string
  username: string
  email: string
  role: UserRole
  isActive: boolean
  password: string
}

interface AuthContextValue {
  user: AuthUser | null
  users: AuthUser[]
  login: (username: string, password: string) => boolean
  logout: () => void
  setUsers: Dispatch<SetStateAction<AuthUser[]>>
}

const initialUsers: AuthUser[] = [
  {
    id: 'u1',
    name: 'Ariel Santos',
    username: 'admin',
    email: 'admin@laundrypos.com',
    role: 'Administrator',
    isActive: true,
    password: 'admin123',
  },
  {
    id: 'u2',
    name: 'Mina Cruz',
    username: 'manager',
    email: 'manager@laundrypos.com',
    role: 'Manager',
    isActive: true,
    password: 'manager123',
  },
  {
    id: 'u3',
    name: 'Rene Dela Cruz',
    username: 'staff',
    email: 'staff@laundrypos.com',
    role: 'Staff/Cashier',
    isActive: true,
    password: 'staff123',
  },
]

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [users, setUsers] = useState<AuthUser[]>(initialUsers)

  const login = (username: string, password: string) => {
    const matchedUser = users.find(
      (entry) => entry.username === username && entry.password === password && entry.isActive,
    )

    if (matchedUser) {
      setUser(matchedUser)
      return true
    }

    return false
  }

  const logout = () => {
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, users, login, logout, setUsers }),
    [user, users],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
