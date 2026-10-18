/**
 * Toggleable fields on a production board order card, in display order.
 *
 * Kept out of the component file so that module exports only a component and
 * React Fast Refresh keeps working.
 */
export const CARD_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'customer', label: 'Customer' },
  { key: 'service', label: 'Service' },
  { key: 'weight', label: 'Weight' },
  { key: 'loads', label: 'Loads' },
  { key: 'items', label: 'Items' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'priority', label: 'Priority' },
  { key: 'payment', label: 'Payment' },
  { key: 'status', label: 'Status' },
]