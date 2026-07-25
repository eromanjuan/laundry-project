/**
 * Central seed data + shared record types.
 *
 * These arrays are used two ways:
 *  1. As the local fallback dataset when Firebase is not yet configured.
 *  2. As the initial data written to Firestore by the one-time seeder
 *     (see `src/lib/seed.ts`) so a brand-new project starts with sample records.
 *
 * Every record type has a string `id` (a human-readable business code such as
 * "C-1001" or "#1041"). Firestore's own document id is tracked separately as
 * `_docId` by the `useCollection` hook, so these codes stay stable for display.
 */

export type UserRole = 'Administrator' | 'Manager' | 'Staff/Cashier'

export interface UserRecord {
  id: string
  name: string
  username: string
  email: string
  role: UserRole
  isActive: boolean
  password: string
  /** Set after an admin reset — forces the user to choose a new password at next login. */
  mustChangePassword?: boolean
  /** Profile photo as a small base64 data URL. */
  photo?: string
}

/** Default password an admin reset falls back to. */
export const DEFAULT_RESET_PASSWORD = '12345'

export interface CustomerRecord {
  id: string
  name: string
  mobile: string
  address: string
  loyaltyPoints: number
  totalOrders: number
  outstandingBalance: string
  lastVisit: string
  status: 'VIP' | 'Active' | 'Inactive'
}

export interface ExpenseRecord {
  id: string
  date: string
  category: string
  description: string
  amount: string
  paymentMethod: string
  paidTo: string
  recordedBy: string
  notes: string
}

export interface PaymentRecord {
  id: string
  orNumber: string
  jobNumber: string
  customer: string
  amountDue: string
  amountPaid: string
  balance: string
  paymentMethod: 'Cash' | 'GCash'
  paymentDate: string
  cashier: string
  status: 'Paid' | 'Partial' | 'Unpaid'
}

export interface OrderRecord {
  id: string
  customer: string
  service: string
  weight: string
  loads: number
  totalLaundries: number
  assigned: string
  timeReceived: string
  estimatedRelease: string
  priority: 'Express' | 'Normal'
  paymentStatus: string
  status: string
  category: 'Express' | 'Full Service' | 'Self Service' | 'Commercial' | 'Ready Today'
  amount: string
  /** Local calendar date the order was received (YYYY-MM-DD). */
  date?: string
  /** Date & time washing started (human-readable local string). */
  startedAt?: string
  /** Date & time the order was released / claimed. */
  releasedAt?: string
  /** Retail products purchased with the order, e.g. "Detergent x2, Hanger x1". */
  extras?: string
  /** Additional options chosen, e.g. "Pickup, Fabric Softener". */
  addOns?: string
}

/** Local calendar date as YYYY-MM-DD (used for date-range filtering). */
export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

/** Human-readable local date + time stamp, e.g. "Jul 23, 2026, 5:49 PM". */
export function nowStamp() {
  return new Date().toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface ClaimRecord {
  id: string
  customer: string
  mobile: string
  service: string
  weight: string
  loads: number
  dateReceived: string
  releaseSchedule: string
  totalAmount: string
  amountPaid: string
  balance: string
  paymentStatus: 'Paid' | 'Unpaid'
  claimStatus: 'Ready for Claim' | 'Released'
}

export interface MachineRecord {
  id: string
  name: string
  type: 'Washer' | 'Dryer'
  status: 'Available' | 'Busy' | 'Maintenance'
  /** Job order id this machine is currently processing (when Busy). */
  orderId?: string
  cycles: number
  interval: number
  /**
   * How this machine's status/cycles are driven:
   *  - 'Manual' (default): staff set status by hand and clear cycles with a password.
   *  - 'Auto': pulled from the LG ThinQ Commercial Laundry API for the mapped device.
   */
  monitorMode?: 'Manual' | 'Auto'
  /** LG device id this machine maps to when monitorMode === 'Auto'. */
  lgDeviceId?: string
  /** Last live run-state reported by LG (Auto only), e.g. 'Running' | 'Finished'. */
  lgState?: string
  /** Remaining cycle minutes reported by LG (Auto only). */
  lgRemaining?: number
  /** Timestamp (ms) of the last successful LG sync (Auto only). */
  lgSyncedAt?: number
}

export const seedMachines: MachineRecord[] = []

export interface ActivityRecord {
  id: string
  action: string
  user: string
  at: string
}

export const seedActivity: ActivityRecord[] = []

export interface CashPaymentRecord {
  id: string
  date: string
  customer: string
  amount: number
  method: 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Credit'
  status: 'Full' | 'Partial' | 'Deposit'
  recognizedSales: number
  drawerImpact: number
  outstandingBalance: number
  remarks: string
}

export interface CollectionRecord {
  id: string
  datetime: string
  collectedBy: string
  amount: number
  remainingFloat: number
  remarks: string
}

export const seedUsers: UserRecord[] = [
  { id: 'u1', name: 'Ariel Santos', username: 'admin', email: 'admin@laundrypos.com', role: 'Administrator', isActive: true, password: 'admin123' },
  { id: 'u2', name: 'Mina Cruz', username: 'manager', email: 'manager@laundrypos.com', role: 'Manager', isActive: true, password: 'manager123' },
  { id: 'u3', name: 'Rene Dela Cruz', username: 'staff', email: 'staff@laundrypos.com', role: 'Staff/Cashier', isActive: true, password: 'staff123' },
]

export const seedCustomers: CustomerRecord[] = [
  { id: 'C-1001', name: 'Maria Santos', mobile: '0917 223 4410', address: 'Block 12, Greenlane', loyaltyPoints: 520, totalOrders: 18, outstandingBalance: '₱1,240', lastVisit: '2 hrs ago', status: 'VIP' },
  { id: 'C-1002', name: 'Jose Cruz', mobile: '0928 551 9032', address: 'Unit 8B, Harbor Street', loyaltyPoints: 210, totalOrders: 9, outstandingBalance: '₱380', lastVisit: 'Yesterday', status: 'Active' },
  { id: 'C-1003', name: 'Rina Dela Cruz', mobile: '0998 110 3345', address: 'Lot 4, Pine Heights', loyaltyPoints: 76, totalOrders: 4, outstandingBalance: '₱0', lastVisit: '3 days ago', status: 'Inactive' },
]

export const seedExpenses: ExpenseRecord[] = [
  { id: 'EXP-1001', date: '2026-07-20', category: 'Detergent', description: 'Bulk detergent purchase', amount: '₱4,200', paymentMethod: 'Cash', paidTo: 'Clean Supply Co.', recordedBy: 'Admin', notes: 'Restocked for the week' },
  { id: 'EXP-1002', date: '2026-07-18', category: 'Water Bill', description: 'Water utility invoice', amount: '₱1,760', paymentMethod: 'Bank Transfer', paidTo: 'Metro Water', recordedBy: 'Finance', notes: 'Monthly statement' },
  { id: 'EXP-1003', date: '2026-07-16', category: 'Staff Salary', description: 'Payroll for attendants', amount: '₱18,500', paymentMethod: 'Bank Transfer', paidTo: 'Laundry Team', recordedBy: 'Admin', notes: 'Weekly payroll' },
  { id: 'EXP-1004', date: '2026-07-14', category: 'Maintenance', description: 'Washer repair kit', amount: '₱2,860', paymentMethod: 'GCash', paidTo: 'Prime Appliance', recordedBy: 'Operations', notes: 'Replaced belts' },
]

export const seedPayments: PaymentRecord[] = [
  { id: 'OR-1001', orNumber: 'OR-1001', jobNumber: '#1031', customer: 'Maria Santos', amountDue: '₱320', amountPaid: '₱320', balance: '₱0', paymentMethod: 'Cash', paymentDate: 'Today', cashier: 'Admin', status: 'Paid' },
  { id: 'OR-1002', orNumber: 'OR-1002', jobNumber: '#1032', customer: 'Jose Cruz', amountDue: '₱480', amountPaid: '₱240', balance: '₱240', paymentMethod: 'GCash', paymentDate: 'Today', cashier: 'Admin', status: 'Partial' },
  { id: 'OR-1003', orNumber: 'OR-1003', jobNumber: '#1034', customer: 'Liza Gomez', amountDue: '₱260', amountPaid: '₱0', balance: '₱260', paymentMethod: 'Cash', paymentDate: 'Yesterday', cashier: 'Admin', status: 'Unpaid' },
]

export const seedOrders: OrderRecord[] = [
  { id: '#1031', customer: 'Maria Santos', service: 'Wash & Fold', weight: '6.5 kg', loads: 2, totalLaundries: 12, assigned: 'Washer 1', timeReceived: '08:20', estimatedRelease: '14:00', priority: 'Express', paymentStatus: 'Paid', status: 'Received', category: 'Express', amount: '₱320' },
  { id: '#1032', customer: 'Jose Cruz', service: 'Comforter', weight: '8.0 kg', loads: 3, totalLaundries: 5, assigned: 'Washer 2', timeReceived: '08:55', estimatedRelease: '15:30', priority: 'Normal', paymentStatus: 'Pending', status: 'Washing', category: 'Full Service', amount: '₱480' },
  { id: '#1033', customer: 'Rina Dela Cruz', service: 'Dry Only', weight: '3.2 kg', loads: 1, totalLaundries: 4, assigned: 'Dryer 1', timeReceived: '09:10', estimatedRelease: '11:20', priority: 'Express', paymentStatus: 'Paid', status: 'Ready', category: 'Ready Today', amount: '₱180' },
  { id: '#1034', customer: 'Liza Gomez', service: 'Wash Only', weight: '4.8 kg', loads: 2, totalLaundries: 7, assigned: 'Dryer 2', timeReceived: '09:40', estimatedRelease: '13:20', priority: 'Normal', paymentStatus: 'Paid', status: 'Received', category: 'Commercial', amount: '₱260' },
]

export const seedClaims: ClaimRecord[] = [
  { id: '#1041', customer: 'Maria Santos', mobile: '0917 223 4410', service: 'Wash & Fold', weight: '6.5 kg', loads: 2, dateReceived: 'Jul 20', releaseSchedule: 'Today 14:00', totalAmount: '₱320', amountPaid: '₱320', balance: '₱0', paymentStatus: 'Paid', claimStatus: 'Ready for Claim' },
  { id: '#1042', customer: 'Jose Cruz', mobile: '0928 551 9032', service: 'Comforter', weight: '8.0 kg', loads: 3, dateReceived: 'Jul 20', releaseSchedule: 'Today 15:30', totalAmount: '₱480', amountPaid: '₱240', balance: '₱240', paymentStatus: 'Unpaid', claimStatus: 'Ready for Claim' },
  { id: '#1043', customer: 'Rina Dela Cruz', mobile: '0998 110 3345', service: 'Dry Only', weight: '3.2 kg', loads: 1, dateReceived: 'Jul 19', releaseSchedule: 'Today 11:20', totalAmount: '₱180', amountPaid: '₱180', balance: '₱0', paymentStatus: 'Paid', claimStatus: 'Released' },
]

export const seedCashPayments: CashPaymentRecord[] = [
  { id: 'TX-1001', date: '2026-07-22', customer: 'Maria Santos', amount: 300, method: 'Cash', status: 'Full', recognizedSales: 300, drawerImpact: 300, outstandingBalance: 0, remarks: 'Full cash payment' },
  { id: 'TX-1002', date: '2026-07-22', customer: 'Jose Cruz', amount: 180, method: 'GCash', status: 'Full', recognizedSales: 180, drawerImpact: 0, outstandingBalance: 0, remarks: 'GCash full settlement' },
  { id: 'TX-1003', date: '2026-07-22', customer: 'Liza Gomez', amount: 200, method: 'Cash', status: 'Partial', recognizedSales: 0, drawerImpact: 100, outstandingBalance: 100, remarks: 'Deposit received' },
  { id: 'TX-1004', date: '2026-07-22', customer: 'Rina Dela Cruz', amount: 250, method: 'Maya', status: 'Deposit', recognizedSales: 0, drawerImpact: 0, outstandingBalance: 250, remarks: 'Advance payment' },
]

export const seedCollections: CollectionRecord[] = [
  { id: 'COL-001', datetime: '2026-07-22 14:20', collectedBy: 'Admin', amount: 500, remainingFloat: 8500, remarks: 'Cash pickup from front counter' },
]

/**
 * Next unique business id for a prefixed series (e.g. "C-1005", "#1035").
 * Uses the highest existing number + 1 so ids never collide after a deletion.
 */
export function nextId(records: Array<{ id: string }>, prefix: string, start: number) {
  const highest = records.reduce((max, record) => {
    const numeric = Number.parseInt(String(record.id).replace(/\D/g, ''), 10)
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, start - 1)
  return `${prefix}${highest + 1}`
}

/** Registry consumed by the Firestore seeder — collection name → seed rows. */
export const seedRegistry: Record<string, Array<{ id: string }>> = {
  users: seedUsers,
  customers: seedCustomers,
  expenses: seedExpenses,
  payments: seedPayments,
  orders: seedOrders,
  claims: seedClaims,
  cashPayments: seedCashPayments,
  collections: seedCollections,
}
