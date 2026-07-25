import { useState } from 'react'
import QRCode from 'qrcode'
import { FaPrint, FaQrcode, FaSave, FaTimes, FaUserPlus, FaWalking, FaPlus, FaTrash } from 'react-icons/fa'
import { InfoCard } from '../components/InfoCard'
import { SectionCard } from '../components/SectionCard'
import { SummaryRow } from '../components/SummaryRow'
import { ToggleOption } from '../components/ToggleOption'
import { AddCustomerModal, type CustomerFormValues } from '../components/AddCustomerModal'
import { useCollection, type WithDocId } from '../hooks/useCollection'
import { usePricing } from '../hooks/usePricing'
import { useBranding } from '../hooks/useBranding'
import { useBusiness } from '../hooks/useBusiness'
import { useAuth } from '../context/AuthContext'
import { loadsForWeight } from '../data/pricing'
import { nextId, todayISO, nowStamp, seedActivity, seedCustomers, seedOrders, type ActivityRecord, type CustomerRecord, type OrderRecord } from '../data/seeds'
import { printReceipt, printReceipts, receiptDocType, type ReceiptData, type ReceiptItem, type ReceiptLine } from '../lib/printReceipt'
import { trackUrl, publishStatus } from '../lib/tracking'

const paymentMethods = ['Cash', 'GCash', 'Bank Transfer', 'Partial Payment']

function peso(value: number) {
  return `₱${value.toLocaleString('en-PH')}`
}

interface LaundryItem {
  id: number
  loadType: string
  weight: string
  serviceQty: Record<string, number>
}

const newItem = (): LaundryItem => ({ id: Date.now() + Math.floor(Math.random() * 1000), loadType: '', weight: '7', serviceQty: { 'Wash & Fold': 1 } })

export function JobOrdersPage() {
  const { pricing } = usePricing()
  const { logoUrl } = useBranding()
  const { business } = useBusiness()
  const { data: customers, add: addCustomer, update: updateCustomer } = useCollection<CustomerRecord>('customers', seedCustomers)
  const { data: orders, add: addOrder } = useCollection<OrderRecord>('orders', seedOrders)
  const { add: addActivity } = useCollection<ActivityRecord>('activity', seedActivity)
  const { user } = useAuth()

  const [customerQuery, setCustomerQuery] = useState('')
  const [selected, setSelected] = useState<(CustomerRecord & WithDocId) | null>(null)
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  const [items, setItems] = useState<LaundryItem[]>([newItem()])
  const [priority, setPriority] = useState('Express')
  const [options, setOptions] = useState<string[]>([])
  const [discount, setDiscount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [redeemPoints, setRedeemPoints] = useState('0')
  const [productQty, setProductQty] = useState<Record<string, number>>({})
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  const matches = (() => {
    const search = customerQuery.trim().toLowerCase()
    if (!search) return []
    return customers.filter((c) => [c.name, c.mobile, c.id].join(' ').toLowerCase().includes(search)).slice(0, 6)
  })()

  // ---- Item management ----
  const addLaundryItem = () => setItems((current) => [...current, newItem()])
  const removeLaundryItem = (id: number) => setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current))
  const setItemField = (id: number, field: 'loadType' | 'weight', value: string) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  const setItemService = (id: number, name: string, delta: number) =>
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, serviceQty: { ...item.serviceQty, [name]: Math.max(0, (item.serviceQty[name] || 0) + delta) } } : item,
      ),
    )

  // ---- Per-item pricing ----
  const computeItem = (item: LaundryItem) => {
    const kg = Number.parseFloat(item.weight) || 0
    const lt = pricing.loadTypes.find((type) => type.name === item.loadType)
    const isPerKilo = lt?.mode === 'per-kilo'
    const kgPerLoad = lt?.kgPerLoad ?? pricing.minLoadKg
    const loads = loadsForWeight(kg, kgPerLoad)
    const chosen = pricing.services.filter((service) => (item.serviceQty[service.name] || 0) > 0)
    const servicePerLoad = chosen.reduce((sum, service) => sum + service.price * (item.serviceQty[service.name] || 0), 0)
    const billedKg = isPerKilo ? Math.max(kg, lt?.minKg || 0) : kg
    const serviceCharge = isPerKilo ? billedKg * (lt?.pricePerKilo || 0) : servicePerLoad * loads
    const perKiloRate = lt ? (isPerKilo ? 0 : lt.pricePerKilo) : pricing.pricePerKilo
    const perKiloCharge = (perKiloRate || 0) * kg
    return { kg, lt, isPerKilo, kgPerLoad, loads, chosen, servicePerLoad, billedKg, serviceCharge, perKiloCharge, total: serviceCharge + perKiloCharge }
  }

  const computed = items.map(computeItem)
  const itemsTotal = computed.reduce((sum, c) => sum + c.total, 0)
  const totalLoads = computed.reduce((sum, c) => sum + c.loads, 0)
  const totalKg = computed.reduce((sum, c) => sum + c.kg, 0)
  const validItems = computed.filter((c) => c.kg > 0 && (c.isPerKilo || c.chosen.length > 0))

  // ---- Order-level extras ----
  const exclusiveOptions = ['Pickup', 'Delivery']
  const toggleOption = (option: string) =>
    setOptions((current) => {
      if (current.includes(option)) return current.filter((item) => item !== option)
      const next = [...current, option]
      return exclusiveOptions.includes(option) ? next.filter((item) => item === option || !exclusiveOptions.includes(item)) : next
    })

  const addOnTotal = options.reduce((sum, name) => sum + (pricing.addOns.find((a) => a.name === name)?.price ?? 0), 0)
  const selectedProducts = pricing.products.filter((product) => (productQty[product.name] || 0) > 0)
  const productsTotal = selectedProducts.reduce((sum, product) => sum + product.price * (productQty[product.name] || 0), 0)
  const extrasSummary = selectedProducts.map((product) => `${product.name} x${productQty[product.name]}`).join(', ')
  const setProduct = (name: string, delta: number) =>
    setProductQty((current) => ({ ...current, [name]: Math.max(0, (current[name] || 0) + delta) }))

  const discountValue = Number.parseFloat(discount) || 0
  const isRegistered = Boolean(selected && selected._docId)
  const availablePoints = selected?.loyaltyPoints ?? 0
  const redeemRequested = isRegistered ? Math.max(0, Math.min(Number(redeemPoints) || 0, availablePoints)) : 0
  const redemptionValue = pricing.pointsPerPeso > 0 ? redeemRequested / pricing.pointsPerPeso : 0

  const grandTotal = Math.max(0, itemsTotal + addOnTotal + productsTotal - discountValue - redemptionValue)
  const received = Number.parseFloat(amountReceived) || 0
  const change = Math.max(0, received - grandTotal)
  const isFullyPaid = received >= grandTotal && grandTotal > 0
  const nextJobNumber = nextId(orders, '#', 1031)

  const itemLabel = (item: LaundryItem, c: ReturnType<typeof computeItem>) => {
    const svc = c.isPerKilo
      ? `${item.loadType || 'Per-kilo'} ${c.billedKg}kg`
      : c.chosen.map((s) => (item.serviceQty[s.name] > 1 ? `${s.name}×${item.serviceQty[s.name]}` : s.name)).join('+')
    return `${svc} (${item.loadType || 'Standard'}, ${c.kg}kg)`
  }
  const orderServiceLabel = items.map((item, idx) => itemLabel(item, computed[idx])).join(' | ')

  const activeCustomer = selected
    ? { name: selected.name, mobile: selected.mobile, loyalty: selected.loyaltyPoints, balance: selected.outstandingBalance, status: selected.status }
    : isWalkIn
      ? { name: 'Walk-in Customer', mobile: '—', loyalty: 0, balance: '₱0', status: 'Walk-in' as const }
      : null

  // The order can only be saved/printed once a customer is chosen AND there's
  // something billable — at least one laundry service or a retail product.
  const hasService = validItems.length > 0
  const hasProduct = selectedProducts.length > 0
  const canSave = Boolean(activeCustomer) && (hasService || hasProduct)

  const selectCustomer = (customer: CustomerRecord & WithDocId) => {
    setSelected(customer)
    setIsWalkIn(false)
    setCustomerQuery('')
    setRedeemPoints('0')
  }
  const chooseWalkIn = () => {
    setSelected(null)
    setIsWalkIn(true)
    setCustomerQuery('')
    setRedeemPoints('0')
  }
  const clearCustomer = () => {
    setSelected(null)
    setIsWalkIn(false)
    setRedeemPoints('0')
  }

  const handleNewCustomer = (payload: CustomerFormValues) => {
    const record: CustomerRecord = {
      id: nextId(customers, 'C-', 1001),
      name: payload.name,
      mobile: payload.mobile,
      address: payload.address,
      loyaltyPoints: 0,
      totalOrders: 0,
      outstandingBalance: '₱0',
      lastVisit: 'Just added',
      status: 'Active',
    }
    void addCustomer(record)
    setSelected(record)
    setIsWalkIn(false)
  }

  // ---- Receipt ----
  const receiptItems = (): ReceiptItem[] => {
    const lines: ReceiptItem[] = []
    items.forEach((item, idx) => {
      const c = computed[idx]
      if (c.isPerKilo) {
        lines.push({ name: `${item.loadType || 'Per-kilo'} (${c.billedKg}kg × ₱${c.lt?.pricePerKilo}/kg)`, amount: peso(c.serviceCharge) })
      } else {
        c.chosen.forEach((s) => {
          lines.push({ name: `${s.name} ×${item.serviceQty[s.name]} (${c.loads}L)`, amount: peso(s.price * item.serviceQty[s.name] * c.loads) })
        })
        if (c.perKiloCharge > 0) lines.push({ name: `Per-kilo (${c.kg}kg)`, amount: peso(c.perKiloCharge) })
      }
    })
    selectedProducts.forEach((product) => lines.push({ name: `${product.name} x${productQty[product.name]}`, amount: peso(product.price * (productQty[product.name] || 0)) }))
    return lines
  }

  const receiptTotals = (): ReceiptLine[] => {
    const lines: ReceiptLine[] = [{ label: 'Laundry Subtotal', value: peso(itemsTotal) }]
    if (addOnTotal > 0) lines.push({ label: 'Add-ons', value: peso(addOnTotal) })
    if (productsTotal > 0) lines.push({ label: 'Products', value: peso(productsTotal) })
    if (discountValue > 0) lines.push({ label: 'Discount', value: `-${peso(discountValue)}` })
    if (redemptionValue > 0) lines.push({ label: `Loyalty (${redeemRequested}pts)`, value: `-${peso(redemptionValue)}` })
    lines.push({ label: 'GRAND TOTAL', value: peso(grandTotal) })
    if (received > 0) lines.push({ label: 'Amount Paid', value: peso(Math.min(received, grandTotal)) })
    const balanceDue = Math.max(0, grandTotal - received)
    if (balanceDue > 0) lines.push({ label: 'BALANCE DUE', value: peso(balanceDue) })
    else if (received > grandTotal) lines.push({ label: 'Change', value: peso(received - grandTotal) })
    return lines
  }

  // `copy=false` is the single OFFICIAL receipt printed at save; every later
  // print is a COPY. Unpaid orders are always PROVISIONAL until fully paid.
  const buildReceiptData = (qr?: string, copy = false): ReceiptData => ({
    logoUrl,
    businessName: business.name,
    tagline: [business.address, business.contact].filter(Boolean).join(' • ') || 'Cleaner care, better living',
    docType: receiptDocType(isFullyPaid, copy),
    jobNumber: nextJobNumber,
    customer: activeCustomer?.name ?? 'Walk-in Customer',
    datetime: nowStamp(),
    printedAt: nowStamp(),
    meta: [
      { label: 'Items', value: String(items.length) },
      { label: 'Total Weight', value: `${totalKg} kg` },
      { label: 'Total Loads', value: String(totalLoads) },
      { label: 'Priority', value: priority },
      { label: 'Payment', value: paymentMethod },
    ],
    items: receiptItems(),
    totals: receiptTotals(),
    footer: isFullyPaid ? business.footer : 'UNPAID — settle the balance to get your official paid receipt.',
    qrDataUrl: qr,
  })

  const buildClaimStubData = (qr?: string, copy = false): ReceiptData => ({
    logoUrl,
    businessName: business.name,
    tagline: [business.address, business.contact].filter(Boolean).join(' • ') || 'Cleaner care, better living',
    docType: copy ? 'CLAIM STUB (COPY)' : 'CLAIM STUB',
    jobNumber: nextJobNumber,
    customer: activeCustomer?.name ?? 'Walk-in Customer',
    datetime: nowStamp(),
    printedAt: nowStamp(),
    meta: [
      { label: 'Details', value: orderServiceLabel || '—' },
      { label: 'Total Weight', value: `${totalKg} kg` },
      { label: 'Total Loads', value: String(totalLoads) },
      { label: 'Total', value: peso(grandTotal) },
      { label: 'Payment', value: isFullyPaid ? 'PAID' : 'UNPAID' },
    ],
    footer: 'Present this stub to claim your laundry.',
    qrDataUrl: qr,
  })

  /** QR (data URL) that points at the public /track page for this job. */
  const makeTrackQr = () =>
    QRCode.toDataURL(trackUrl(nextJobNumber), { width: 220, margin: 1 }).catch(() => undefined)

  // Manual buttons on the entry screen are reprints → COPY.
  const handlePrintReceipt = async () => printReceipt(buildReceiptData(await makeTrackQr(), true))
  const handlePrintClaimStub = async () => printReceipt(buildClaimStubData(await makeTrackQr(), true))

  const handleGenerateQr = async () => {
    try {
      const url = await QRCode.toDataURL(trackUrl(nextJobNumber), { width: 260, margin: 1 })
      setQrDataUrl(url)
    } catch {
      setFeedback({ tone: 'error', text: 'Could not generate QR code.' })
    }
  }

  // Open the review modal — guards that there's a customer and something billable.
  const requestSave = () => {
    if (!activeCustomer) {
      setFeedback({ tone: 'error', text: 'Select an existing customer, choose Walk-in, or add a new customer first.' })
      return
    }
    if (!hasService && !hasProduct) {
      setFeedback({ tone: 'error', text: 'This order is empty — add at least one laundry service or a product before saving.' })
      return
    }
    setFeedback(null)
    setShowConfirm(true)
  }

  const handleSaveOrder = async () => {
    setShowConfirm(false)
    if (!activeCustomer) {
      setFeedback({ tone: 'error', text: 'Select an existing customer, choose Walk-in, or add a new customer first.' })
      return
    }
    if (!hasService && !hasProduct) {
      setFeedback({ tone: 'error', text: 'This order is empty — add at least one laundry service or a product before saving.' })
      return
    }

    const fullyPaid = received >= grandTotal && grandTotal > 0

    void addOrder({
      id: nextJobNumber,
      customer: activeCustomer.name,
      service: hasService ? orderServiceLabel : (extrasSummary || 'Products only'),
      weight: `${totalKg} kg`,
      loads: totalLoads,
      totalLaundries: totalLoads,
      assigned: 'Unassigned',
      timeReceived: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estimatedRelease: '—',
      priority: priority === 'Express' ? 'Express' : 'Normal',
      paymentStatus: fullyPaid ? 'Paid' : 'Pending',
      status: 'Pending',
      category: priority === 'Express' ? 'Express' : 'Full Service',
      amount: peso(grandTotal),
      date: todayISO(),
      extras: extrasSummary || '',
      addOns: options.join(', '),
    })

    // Publish the initial status + payment so the tracking QR resolves immediately
    // and shows any pending balance.
    void publishStatus(nextJobNumber, 'Pending', {
      paymentStatus: fullyPaid ? 'Paid' : 'Pending',
      balance: fullyPaid ? '₱0' : peso(grandTotal),
    })

    void addActivity({
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      action: `${nextJobNumber}: job order received (Pending) — ${activeCustomer.name}, ${items.length} item(s), ${peso(grandTotal)}`,
      user: user?.name ?? 'Unknown',
      at: nowStamp(),
    })

    let earnedNote = ''
    if (selected && selected._docId) {
      const earned = pricing.pointsPerOrder || 0
      const newPoints = Math.max(0, availablePoints - redeemRequested + earned)
      void updateCustomer(selected, { loyaltyPoints: newPoints, totalOrders: selected.totalOrders + 1, lastVisit: 'Just now' })
      earnedNote = ` +${earned} pts${redeemRequested > 0 ? `, -${redeemRequested} redeemed` : ''}`
    }

    setFeedback({ tone: 'success', text: `Job order ${nextJobNumber} saved for ${activeCustomer.name} — ${peso(grandTotal)}, queued as Pending. Start washing from the Production Board.${earnedNote}` })

    const trackQr = await makeTrackQr()
    printReceipts([buildReceiptData(trackQr), buildClaimStubData(trackQr)])

    setItems([newItem()])
    setOptions([])
    setDiscount('0')
    setAmountReceived('')
    setProductQty({})
    clearCustomer()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Job Order Entry</p>
            <h2 className="mt-2 text-3xl font-semibold">Cashier transaction screen</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">Add one or more laundry items (e.g. standard + heavy linen) to a single job order.</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="text-sm text-blue-100">This Order</p>
            <p className="text-xl font-semibold">{items.length} item{items.length === 1 ? '' : 's'} · {totalLoads} loads</p>
          </div>
        </div>
      </section>

      {feedback ? (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="rounded-lg px-2 py-1 text-xs transition hover:bg-white/60">Dismiss</button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.3fr_0.95fr]">
        {/* Customer + Products */}
        <div className="space-y-6">
          <SectionCard title="Customer" subtitle="Search an existing customer, add a new one, or serve a walk-in">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400" placeholder="Search name, mobile, or ID" />
                <button onClick={() => setShowNewCustomer(true)} className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                  <FaUserPlus /> New
                </button>
              </div>

              {matches.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  {matches.map((customer) => (
                    <button key={customer.id} onClick={() => selectCustomer(customer)} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left text-sm transition last:border-b-0 hover:bg-slate-50">
                      <span>
                        <span className="font-semibold text-slate-900">{customer.name}</span>
                        <span className="ml-2 text-slate-500">{customer.mobile}</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{customer.id}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <button onClick={chooseWalkIn} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <FaWalking /> Walk-in Customer
              </button>

              {activeCustomer ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{activeCustomer.name}</p>
                      <p className="text-sm text-slate-500">{activeCustomer.mobile}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{activeCustomer.status}</div>
                      <button onClick={clearCustomer} title="Clear" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-white"><FaTimes /></button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoCard title="Loyalty Points" value={`${activeCustomer.loyalty} pts`} accent="text-blue-700" />
                    <InfoCard title="Outstanding Balance" value={activeCustomer.balance} accent="text-amber-700" />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No customer selected. Search above, add a new one, or choose Walk-in.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Products" subtitle="Retail items sold with the order">
            {pricing.products.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">No products yet. Add them in Settings → Pricing.</p>
            ) : (
              <div className="space-y-2">
                {!hasService ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">
                    Add a laundry service first — products can only be added to an order with a service.
                  </p>
                ) : null}
                {pricing.products.map((product) => (
                  <div key={product.name} className={`flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm ${hasService ? '' : 'opacity-50'}`}>
                    <div>
                      <p className="font-semibold text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-500">{peso(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setProduct(product.name, -1)} disabled={!hasService} className="h-7 w-7 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white">−</button>
                      <span className="w-6 text-center font-semibold text-slate-900">{productQty[product.name] || 0}</span>
                      <button onClick={() => setProduct(product.name, 1)} disabled={!hasService} className="h-7 w-7 rounded-lg border border-blue-200 bg-blue-50 font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-50">+</button>
                    </div>
                  </div>
                ))}
                {productsTotal > 0 ? (
                  <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    <span>Products Subtotal</span>
                    <span>{peso(productsTotal)}</span>
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Laundry items */}
        <div className="space-y-6">
          <SectionCard title="Laundry Details" subtitle="Add each batch — different load types & services in one order">
            <div className="space-y-4">
              {items.map((item, idx) => {
                const c = computed[idx]
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">Laundry #{idx + 1}</p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{peso(c.total)}</span>
                        {items.length > 1 ? (
                          <button onClick={() => removeLaundryItem(item.id)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50"><FaTrash /></button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">Load Type</span>
                        <select value={item.loadType} onChange={(event) => setItemField(item.id, 'loadType', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                          <option value="">Standard ({pricing.minLoadKg}kg/load)</option>
                          {pricing.loadTypes.map((type) => (
                            <option key={type.name} value={type.name}>
                              {type.name} — {type.mode === 'per-kilo' ? `₱${type.pricePerKilo}/kg` : `${type.kgPerLoad}kg/load`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">Weight · {c.loads}L</span>
                        <input value={item.weight} inputMode="numeric" maxLength={3} onChange={(event) => setItemField(item.id, 'weight', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                      </label>
                    </div>

                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">Services{c.isPerKilo ? ' (optional — priced per kilo)' : ''}</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {pricing.services.map((service) => (
                          <div key={service.name} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm">
                            <span className="truncate">
                              <span className="text-slate-800">{service.name}</span>
                              <span className="ml-1 text-xs text-slate-400">{peso(service.price)}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setItemService(item.id, service.name, -1)} className="h-6 w-6 rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100">−</button>
                              <span className="w-5 text-center text-sm font-semibold text-slate-900">{item.serviceQty[service.name] || 0}</span>
                              <button onClick={() => setItemService(item.id, service.name, 1)} className="h-6 w-6 rounded-md border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}

              <button onClick={addLaundryItem} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
                <FaPlus /> Add Laundry Item
              </button>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Priority</p>
                <div className="flex gap-2">
                  {['Normal', 'Express'].map((it) => (
                    <button key={it} type="button" onClick={() => setPriority(it)} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${priority === it ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>{it}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Additional Options</p>
                <div className="grid gap-2">
                  {pricing.addOns.map((option) => (
                    <ToggleOption key={option.name} label={`${option.name} (${peso(option.price)})`} checked={options.includes(option.name)} onChange={() => toggleOption(option.name)} />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Payment */}
        <div className="space-y-6">
          <SectionCard title="Payment" subtitle="Capture charges and payment method">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <SummaryRow label={`Laundry (${items.length} item${items.length === 1 ? '' : 's'})`} value={peso(itemsTotal)} />
                {addOnTotal > 0 ? <SummaryRow label="Add-ons" value={peso(addOnTotal)} /> : null}
                {productsTotal > 0 ? <SummaryRow label="Products" value={peso(productsTotal)} /> : null}
                <SummaryRow label="Discount" value={`-${peso(discountValue)}`} accent="text-rose-600" />
                {redemptionValue > 0 ? <SummaryRow label={`Loyalty (${redeemRequested} pts)`} value={`-${peso(redemptionValue)}`} accent="text-emerald-600" /> : null}
                <div className="border-t border-slate-200 pt-2">
                  <SummaryRow label="Grand Total" value={peso(grandTotal)} accent="text-blue-700" />
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Discount (₱)</span>
                <input type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
              </label>

              {isRegistered && availablePoints > 0 ? (
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Redeem Loyalty Points <span className="text-slate-400">({availablePoints} available · {pricing.pointsPerPeso} pts = ₱1)</span></span>
                  <input type="number" min="0" max={availablePoints} value={redeemPoints} onChange={(event) => setRedeemPoints(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
                </label>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Payment Method</p>
                <div className="grid gap-2">
                  {paymentMethods.map((method) => (
                    <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${paymentMethod === method ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{method}</button>
                  ))}
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Amount Received</span>
                <input type="number" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" placeholder="0" />
              </label>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <p className="font-semibold">Change</p>
                <p className="mt-1">{peso(change)}</p>
              </div>

              <div className="grid gap-2">
                <button onClick={requestSave} disabled={!canSave} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600">
                  <FaSave /> Save Job Order
                </button>
                {!canSave ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">
                    {activeCustomer
                      ? 'Add at least one laundry service or a product to enable saving.'
                      : 'Select a customer (or Walk-in) and add a service or product to enable saving.'}
                  </p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <button onClick={handlePrintReceipt} disabled={!canSave} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"><FaPrint /> Print Receipt</button>
                  <button onClick={handlePrintClaimStub} disabled={!canSave} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"><FaPrint /> Print Claim Stub</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button onClick={handleGenerateQr} disabled={!canSave} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"><FaQrcode /> Generate QR Code</button>
                  <button onClick={clearCustomer} className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"><FaTimes /> Cancel</button>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Job Order Preview" subtitle="Snapshot for quick confirmation">
        <div className="grid gap-4 md:grid-cols-4">
          <InfoCard title="Job Number" value={nextJobNumber} />
          <InfoCard title="Customer" value={activeCustomer?.name ?? '—'} />
          <InfoCard title="Loads / Weight" value={`${totalLoads} × ${totalKg || 0}kg`} accent="text-blue-700" />
          <InfoCard title="Grand Total" value={peso(grandTotal)} accent="text-emerald-700" />
        </div>
      </SectionCard>

      <AddCustomerModal isOpen={showNewCustomer} onClose={() => setShowNewCustomer(false)} onSubmit={handleNewCustomer} />

      {/* Review-before-save: confirm customer, services, products & total. */}
      {showConfirm && activeCustomer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Review Job Order</h3>
                <p className="mt-1 text-sm text-slate-500">Confirm the details before saving {nextJobNumber}.</p>
              </div>
              <button onClick={() => setShowConfirm(false)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"><FaTimes /></button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
              <p className="mt-1 font-semibold text-slate-900">{activeCustomer.name}</p>
              <p className="text-sm text-slate-500">
                {activeCustomer.mobile}{activeCustomer.status ? ` • ${activeCustomer.status}` : ''}
              </p>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-100 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Services &amp; Products</p>
              <div className="mt-2 space-y-1.5">
                {receiptItems().map((line, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-slate-600">{line.name}</span>
                    <span className="whitespace-nowrap font-semibold text-slate-900">{line.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
              <div className="space-y-1.5">
                {receiptTotals().map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between ${
                      line.label === 'GRAND TOTAL'
                        ? 'mt-1 border-t border-blue-200 pt-2 text-base font-bold text-blue-700'
                        : 'text-sm text-slate-600'
                    }`}
                  >
                    <span>{line.label}</span>
                    <span className="font-semibold">{line.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Payment method: <span className="font-semibold text-slate-700">{paymentMethod}</span></p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={handleSaveOrder} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                <FaSave /> Save Job Order
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {qrDataUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Order QR Code</h3>
              <button onClick={() => setQrDataUrl(null)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"><FaTimes /></button>
            </div>
            <img src={qrDataUrl} alt="Order QR code" className="mx-auto mt-4 h-56 w-56" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{nextJobNumber}</p>
            <a href={qrDataUrl} download={`qr-${nextJobNumber}.png`} className="mt-4 inline-block rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Download QR</a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
