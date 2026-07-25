/**
 * Shared receipt / claim-stub builders for REPRINTS from a saved order.
 *
 * The Job Order screen builds the detailed original receipt from live form state;
 * everywhere else (Production Board, Claim Laundry, Payments) reprints from the
 * stored order record using these helpers, so copies stay consistent — official
 * vs copy labelling, a printed timestamp, and the tracking QR.
 */
import QRCode from 'qrcode'
import { nowStamp, type OrderRecord } from '../data/seeds'
import type { BusinessInfo } from '../hooks/useBusiness'
import { trackUrl } from './tracking'
import { receiptDocType, type ReceiptData } from './printReceipt'

/** Generate the track-page QR (data URL) for a job, or undefined on failure. */
export function trackQrDataUrl(jobId: string): Promise<string | undefined> {
  return QRCode.toDataURL(trackUrl(jobId), { width: 220, margin: 1 }).catch(() => undefined)
}

function tagline(business: BusinessInfo) {
  return [business.address, business.contact].filter(Boolean).join(' • ') || 'Cleaner care, better living'
}

/** Best available transaction date+time for an order. */
export function orderDatetime(order: OrderRecord): string {
  return [order.date, order.timeReceived].filter(Boolean).join(' ') || order.releasedAt || order.timeReceived || ''
}

/** Full customer receipt (summary) reprinted from a saved order. */
export function buildOrderReceipt(
  order: OrderRecord,
  business: BusinessInfo,
  logoUrl: string | undefined,
  qrDataUrl: string | undefined,
  copy = true,
): ReceiptData {
  const paid = order.paymentStatus === 'Paid'
  return {
    logoUrl,
    businessName: business.name,
    tagline: tagline(business),
    docType: receiptDocType(paid, copy),
    jobNumber: order.id,
    customer: order.customer,
    datetime: orderDatetime(order),
    printedAt: nowStamp(),
    meta: [
      { label: 'Service', value: order.service },
      { label: 'Weight', value: order.weight },
      { label: 'Loads', value: String(order.loads) },
      { label: 'Priority', value: order.priority },
    ],
    totals: [
      { label: 'Total', value: order.amount },
      { label: 'Paid', value: paid ? order.amount : '₱0' },
      { label: 'Balance', value: paid ? '₱0' : order.amount },
      { label: 'Status', value: order.paymentStatus },
    ],
    footer: paid ? business.footer : 'UNPAID — settle the balance to get your official paid receipt.',
    qrDataUrl,
  }
}

/** Claim stub — essentially the scannable barcode used to claim / track. */
export function buildOrderClaimStub(
  order: OrderRecord,
  business: BusinessInfo,
  logoUrl: string | undefined,
  qrDataUrl: string | undefined,
  copy = true,
): ReceiptData {
  return {
    logoUrl,
    businessName: business.name,
    tagline: tagline(business),
    docType: copy ? 'CLAIM STUB (COPY)' : 'CLAIM STUB',
    jobNumber: order.id,
    customer: order.customer,
    datetime: orderDatetime(order),
    printedAt: nowStamp(),
    meta: [
      { label: 'Service', value: order.service },
      { label: 'Payment', value: order.paymentStatus === 'Paid' ? 'PAID' : 'UNPAID' },
    ],
    footer: 'Scan the code to track your laundry, or present this stub to claim it.',
    qrDataUrl,
  }
}
