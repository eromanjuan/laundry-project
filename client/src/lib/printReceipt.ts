/**
 * Thermal-receipt printing. Renders a compact 80mm receipt (logo + details only)
 * into a hidden iframe and prints just that — never the whole screen.
 */

export interface ReceiptLine {
  label: string
  value: string
}

export interface ReceiptItem {
  name: string
  amount: string
}

export interface ReceiptData {
  logoUrl?: string
  businessName?: string
  tagline?: string
  docType: string
  jobNumber: string
  customer: string
  datetime: string
  meta?: ReceiptLine[]
  items?: ReceiptItem[]
  totals?: ReceiptLine[]
  footer?: string
  /** Data-URL QR image the customer can scan to track their order status. */
  qrDataUrl?: string
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] as string))
}

function buildBody(data: ReceiptData) {
  const meta = (data.meta ?? [])
    .map((line) => `<tr><td>${escapeHtml(line.label)}</td><td class="r">${escapeHtml(line.value)}</td></tr>`)
    .join('')

  const items = (data.items ?? [])
    .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="r">${escapeHtml(item.amount)}</td></tr>`)
    .join('')

  const totals = (data.totals ?? [])
    .map((line) => `<tr><td>${escapeHtml(line.label)}</td><td class="r b">${escapeHtml(line.value)}</td></tr>`)
    .join('')

  return `
    ${data.logoUrl ? `<img class="logo" src="${data.logoUrl}" alt="" />` : ''}
    <div class="center title">${escapeHtml(data.businessName ?? 'Laundry Project')}</div>
    ${data.tagline ? `<div class="center muted">${escapeHtml(data.tagline)}</div>` : ''}
    <div class="center muted">${escapeHtml(data.docType)}</div>
    <div class="hr"></div>
    <table>
      <tr><td>Job #</td><td class="r b">${escapeHtml(data.jobNumber)}</td></tr>
      <tr><td>Customer</td><td class="r">${escapeHtml(data.customer)}</td></tr>
      <tr><td>Date</td><td class="r">${escapeHtml(data.datetime)}</td></tr>
      ${meta}
    </table>
    ${items ? `<div class="hr"></div><table>${items}</table>` : ''}
    ${totals ? `<div class="hr"></div><table>${totals}</table>` : ''}
    ${data.qrDataUrl ? `<div class="hr"></div><img class="qr" src="${data.qrDataUrl}" alt="Scan to track your order" /><div class="center muted b">Scan to track your laundry</div>` : ''}
    <div class="hr"></div>
    <div class="center muted">${escapeHtml(data.footer ?? 'Thank you! Please keep this receipt.')}</div>
  `
}

/** Print one or more receipts in a single job (each separated by a cut line). */
export function printReceipts(list: ReceiptData[]) {
  if (list.length === 0) return

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }

  const body = list
    .map((data) => `<div class="receipt">${buildBody(data)}</div>`)
    .join('<div class="cut">— — — — — — ✂ — — — — — —</div>')

  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { width: 80mm; padding: 5mm 4mm; font-family: 'Courier New', ui-monospace, monospace; font-size: 12px; line-height: 1.4; color: #000; }
    .center { text-align: center; }
    .muted { color: #222; font-size: 11px; }
    .title { font-weight: bold; font-size: 15px; letter-spacing: 1px; }
    .logo { display: block; margin: 0 auto 4px; width: 24mm; height: auto; }
    .qr { display: block; margin: 4px auto 2px; width: 28mm; height: auto; }
    .hr { border-top: 1px dashed #000; margin: 5px 0; }
    .cut { text-align: center; color: #000; margin: 10px 0; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; word-break: break-word; }
    td.r { text-align: right; }
    td.b { font-weight: bold; }
  </style></head><body>${body}</body></html>`)
  doc.close()

  const triggerPrint = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 800)
  }

  const images = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[]
  const pending = images.filter((image) => !image.complete)
  if (pending.length === 0) {
    setTimeout(triggerPrint, 150)
    return
  }
  let loaded = 0
  const onDone = () => {
    loaded += 1
    if (loaded >= pending.length) triggerPrint()
  }
  pending.forEach((image) => {
    image.addEventListener('load', onDone)
    image.addEventListener('error', onDone)
  })
}

export function printReceipt(data: ReceiptData) {
  printReceipts([data])
}
