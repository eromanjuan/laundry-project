/**
 * Shape of a row in the payments table, and the toggleable columns in order.
 *
 * Kept out of the component file so that module exports only a component and
 * React Fast Refresh keeps working.
 */
export interface PaymentRow {
  orNumber: string
  jobNumber: string
  customer: string
  amountDue: string
  amountPaid: string
  balance: string
  paymentMethod: string
  paymentDate: string
  cashier: string
  status: 'Paid' | 'Partial' | 'Unpaid'
}

export const PAYMENT_FIELDS: Array<{ key: keyof PaymentRow; label: string }> = [
  { key: 'orNumber', label: 'OR Number' },
  { key: 'jobNumber', label: 'Job Number' },
  { key: 'customer', label: 'Customer' },
  { key: 'amountDue', label: 'Amount Due' },
  { key: 'amountPaid', label: 'Amount Paid' },
  { key: 'balance', label: 'Balance' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'paymentDate', label: 'Payment Date' },
  { key: 'cashier', label: 'Cashier' },
  { key: 'status', label: 'Status' },
]