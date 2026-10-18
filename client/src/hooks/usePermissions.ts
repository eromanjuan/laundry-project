import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../data/seeds'

/**
 * Central role → capability matrix for the whole app.
 *
 *                        Master  Admin   Manager   Staff/Cashier
 *   manageUsers           ✓       ✓        ✗           ✗
 *   managePricing         ✓       ✓        ✓           ✗
 *   manageCustomers *     ✓       ✓        ✓           ✗
 *   addJobOrder           ✓       ✓        ✓           ✓
 *
 * The platform Master has every capability on every client shop. Shop roles are
 * scoped to their own shop only.
 *
 * * manageCustomers = add / edit / delete on the Customers page. Staff can still
 *   register a walk-in / new customer during job-order intake, but cannot manage
 *   the customer database or delete records.
 */
export interface Permissions {
  manageUsers: boolean
  managePricing: boolean
  manageCustomers: boolean
  /** Add / delete machines + clear cycles (Admin & Manager only). */
  manageMachines: boolean
  /** Edit machine details & toggle maintenance — any signed-in staff. */
  editMachines: boolean
  addJobOrder: boolean
}

export function permissionsFor(role: UserRole | undefined): Permissions {
  // The platform master has unrestricted access to every shop's modules.
  if (role === 'Master') {
    return {
      manageUsers: true,
      managePricing: true,
      manageCustomers: true,
      manageMachines: true,
      editMachines: true,
      addJobOrder: true,
    }
  }
  const isAdmin = role === 'Administrator'
  const isManager = role === 'Manager'
  return {
    manageUsers: isAdmin,
    managePricing: isAdmin || isManager,
    manageCustomers: isAdmin || isManager,
    manageMachines: isAdmin || isManager,
    editMachines: Boolean(role),
    addJobOrder: Boolean(role),
  }
}

export function usePermissions(): Permissions {
  const { user } = useAuth()
  return permissionsFor(user?.role)
}
