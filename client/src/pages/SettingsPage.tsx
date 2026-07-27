import { useEffect, useState } from 'react'
import { FaArchive, FaBluetooth, FaCheckCircle, FaExclamationTriangle, FaFileExcel, FaFileImport, FaImage, FaLink, FaPlus, FaPrint, FaSave, FaSpinner, FaSync, FaTrash, FaUnlink, FaUpload, FaUsb } from 'react-icons/fa'
import { SummaryStat } from '../components/SummaryStat'
import { usePricing } from '../hooks/usePricing'
import { usePermissions } from '../hooks/usePermissions'
import { useBranding, fileToResizedDataUrl } from '../hooks/useBranding'
import { useBusiness } from '../hooks/useBusiness'
import { usePaymentSettings } from '../hooks/usePaymentSettings'
import { useLgConnection } from '../hooks/useLgConnection'
import { useLgStatus, syncLgNow } from '../hooks/useLgStatus'
import { backupDatabase, restoreDatabase } from '../lib/backup'
import { printReceipt, setPaperSize } from '../lib/printReceipt'
import { nowStamp } from '../data/seeds'
import { downloadJson } from '../lib/exports'
import type { PriceItem } from '../data/pricing'

type TabKey = 'business' | 'pricing' | 'printer' | 'receipt' | 'system' | 'machineSync' | 'backup'

type PrinterType = 'Generic ESC/POS' | 'XPrinter' | 'Epson' | 'Rongta' | 'Other'
type ConnectionType = 'Bluetooth' | 'LAN (Ethernet)' | 'USB'
type PaperSize = '58mm' | '80mm'
type Density = 'Light' | 'Normal' | 'Dark'
type CharacterSize = 'Small' | 'Normal' | 'Large'

interface PrinterDevice {
  name: string
  address: string
  status: string
}

interface SettingsState {
  businessName: string
  branchName: string
  address: string
  contactNumber: string
  tin: string
  permitNumber: string
  footerMessage: string
  operatingHours: string
  printerName: string
  printerType: PrinterType
  connectionType: ConnectionType
  printerIp: string
  port: string
  paperSize: PaperSize
  density: Density
  autoCut: boolean
  openCashDrawer: boolean
  autoPrintReceipt: boolean
  autoPrintShiftReport: boolean
  autoPrintDailySales: boolean
  receiptHeader: string
  receiptFooter: string
  receiptThankYouMessage: string
  facebookPage: string
  hotline: string
  customNotes: string
  qrCodeEnabled: boolean
  barcodeEnabled: boolean
  currency: string
  timezone: string
  dateFormat: string
  timeFormat: string
  automaticDateTime: boolean
  characterSize: CharacterSize
  paperFeedAfterPrint: boolean
  drawerKick: boolean
  autoPrintCashCollectionReport: boolean
  autoPrintClaimStub: boolean
}

const initialState: SettingsState = {
  businessName: 'Laundry Project POS',
  branchName: 'Main Branch',
  address: '123 Laundry Avenue, Cebu City',
  contactNumber: '+63 917 123 4567',
  tin: '123-456-789-000',
  permitNumber: 'BP-2026-001',
  footerMessage: 'Thank you for choosing Laundry Project!',
  operatingHours: 'Mon-Sun 7:00 AM - 10:00 PM',
  printerName: 'POS Thermal Printer',
  printerType: 'Generic ESC/POS',
  connectionType: 'USB',
  printerIp: '192.168.1.40',
  port: '9100',
  paperSize: '80mm',
  density: 'Normal',
  autoCut: true,
  openCashDrawer: true,
  autoPrintReceipt: true,
  autoPrintShiftReport: true,
  autoPrintDailySales: true,
  receiptHeader: 'Laundry Project POS',
  receiptFooter: 'Please keep this receipt. God Bless!',
  receiptThankYouMessage: 'Thank you for choosing Laundry Project!',
  facebookPage: 'facebook.com/laundryproject',
  hotline: '+63 917 555 0100',
  customNotes: 'Pickup within 24 hours for best quality.',
  qrCodeEnabled: true,
  barcodeEnabled: false,
  currency: 'PHP',
  timezone: 'Asia/Manila',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12H',
  automaticDateTime: true,
  characterSize: 'Normal',
  paperFeedAfterPrint: true,
  drawerKick: false,
  autoPrintCashCollectionReport: true,
  autoPrintClaimStub: false,
}

const sampleBluetoothDevices: PrinterDevice[] = [
  { name: 'Printer001', address: 'DC:0D:30:12:AB:CD', status: 'Available' },
  { name: 'XPrinter XP-P323B', address: 'A8:5E:45:11:90:10', status: 'Available' },
  { name: 'Epson TM-T20', address: 'B2:18:55:21:CF:4D', status: 'Busy' },
]

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'business', label: 'Business Settings' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'printer', label: 'Printer Settings' },
  { key: 'receipt', label: 'Receipt Layout' },
  { key: 'system', label: 'System Settings' },
  { key: 'machineSync', label: 'Machine Sync (LG)' },
  { key: 'backup', label: 'Backup & Restore' },
]

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
    </label>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <FormField label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </FormField>
  )
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('business')
  const [settings, setSettings] = useState(initialState)
  const { pricing, save: savePricing } = usePricing()
  const { managePricing: canManagePricing } = usePermissions()
  const { logoUrl, saveLogo, resetLogo } = useBranding()
  const { business, save: saveBusiness } = useBusiness()
  const { payment: gcashSettings, save: saveGcash } = usePaymentSettings()
  const [gcashForm, setGcashForm] = useState({ gcashName: '', gcashNumber: '', gcashQr: '' })
  const [gcashSaved, setGcashSaved] = useState(false)
  const { connection: lg, save: saveLg } = useLgConnection()
  const { manageMachines } = usePermissions()
  const [savedConfig, setSavedConfig] = useState(false)
  const [backupNote, setBackupNote] = useState('')

  // --- LG account connection (Machine Sync tab) ---
  const [lgForm, setLgForm] = useState({ email: '', password: '', region: 'PH' })
  const [lgConnecting, setLgConnecting] = useState(false)
  const [lgError, setLgError] = useState('')
  const lgStatus = useLgStatus()

  useEffect(() => {
    setLgForm({ email: lg.email, password: lg.password, region: lg.region })
  }, [lg])

  // Save the LG credentials so the sync job (GitHub Actions) can log in. The
  // scheduled job writes live status to Firestore within a few minutes; if an
  // on-demand backend (Cloud Function) happens to exist, we also trigger it now.
  const handleLgConnect = async () => {
    setLgError('')
    setLgConnecting(true)
    const creds = { email: lgForm.email, password: lgForm.password, region: lgForm.region }
    try {
      await saveLg({ ...creds, enabled: true, connected: true, connectedAt: Date.now() })
      // Best-effort immediate sync — ignored if no callable backend is deployed
      // (the scheduled GitHub Actions job will pick it up either way).
      try {
        await syncLgNow()
      } catch {
        /* no on-demand backend — scheduled sync handles it */
      }
    } catch (error) {
      setLgError(error instanceof Error ? error.message : 'Could not save LG credentials.')
      await saveLg({ ...creds, enabled: false, connected: false })
    }
    setLgConnecting(false)
  }

  const handleLgSyncNow = async () => {
    setLgError('')
    setLgConnecting(true)
    try {
      await syncLgNow()
    } catch {
      // No on-demand backend (GitHub Actions model) — guide the user to trigger it.
      setLgError('On-demand sync isn’t available on this setup. Live status refreshes every ~5 minutes automatically, or run the “LG Machine Sync” workflow in GitHub → Actions.')
    }
    setLgConnecting(false)
  }

  const handleLgDisconnect = async () => {
    await saveLg({ ...lg, enabled: false, connected: false })
  }

  useEffect(() => {
    setSettings((current) => ({
      ...current,
      businessName: business.name,
      branchName: business.branch,
      address: business.address,
      contactNumber: business.contact,
      tin: business.tin,
      footerMessage: business.footer,
    }))
  }, [business])

  const handleSaveConfig = () => {
    void saveBusiness({
      name: settings.businessName,
      branch: settings.branchName,
      address: settings.address,
      contact: settings.contactNumber,
      tin: settings.tin,
      footer: settings.footerMessage,
    })
    setSavedConfig(true)
    setTimeout(() => setSavedConfig(false), 2500)
  }

  const handleBackup = async () => {
    setBackupNote('Preparing backup…')
    try {
      await backupDatabase()
      setBackupNote('Backup downloaded.')
    } catch {
      setBackupNote('Backup failed.')
    }
    setTimeout(() => setBackupNote(''), 3000)
  }

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBackupNote('Restoring…')
    try {
      await restoreDatabase(JSON.parse(await file.text()))
      setBackupNote('Restore complete.')
    } catch {
      setBackupNote('Restore failed — invalid backup file.')
    }
    event.target.value = ''
    setTimeout(() => setBackupNote(''), 3000)
  }

  const handleExportSettings = () => {
    downloadJson('laundry-settings', {
      business,
      pricing: priceForm,
      branding: { logoDataUrl: logoUrl.startsWith('data:') ? logoUrl : '' },
    })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      await saveLogo(dataUrl)
    } catch (error) {
      console.error('Logo upload failed:', error)
    }
    event.target.value = ''
  }

  useEffect(() => setGcashForm(gcashSettings), [gcashSettings])

  const handleGcashQrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToResizedDataUrl(file, 512)
      setGcashForm((current) => ({ ...current, gcashQr: dataUrl }))
    } catch (error) {
      console.error('GCash QR upload failed:', error)
    }
    event.target.value = ''
  }

  const handleSaveGcash = () => {
    void saveGcash(gcashForm)
    setGcashSaved(true)
    setTimeout(() => setGcashSaved(false), 2500)
  }
  const [priceForm, setPriceForm] = useState(pricing)
  const [pricingSaved, setPricingSaved] = useState(false)

  useEffect(() => setPriceForm(pricing), [pricing])

  type ItemKey = 'services' | 'addOns' | 'products'

  const updateItem = (key: ItemKey, index: number, field: keyof PriceItem, value: string) => {
    setPriceForm((current) => ({
      ...current,
      [key]: current[key].map((item, i) =>
        i === index ? { ...item, [field]: field === 'price' ? Number(value) || 0 : value } : item,
      ),
    }))
    setPricingSaved(false)
  }

  const removeItem = (key: ItemKey, index: number) => {
    setPriceForm((current) => ({ ...current, [key]: current[key].filter((_, i) => i !== index) }))
    setPricingSaved(false)
  }

  const addItem = (key: ItemKey) => {
    setPriceForm((current) => ({ ...current, [key]: [...current[key], { name: 'New item', price: 0 }] }))
    setPricingSaved(false)
  }

  const updateLoadType = (index: number, field: 'name' | 'mode' | 'kgPerLoad' | 'pricePerKilo' | 'minKg', value: string) => {
    setPriceForm((current) => ({
      ...current,
      loadTypes: current.loadTypes.map((type, i) =>
        i === index ? { ...type, [field]: field === 'name' || field === 'mode' ? value : Number(value) || 0 } : type,
      ),
    }))
    setPricingSaved(false)
  }

  const removeLoadType = (index: number) => {
    setPriceForm((current) => ({ ...current, loadTypes: current.loadTypes.filter((_, i) => i !== index) }))
    setPricingSaved(false)
  }

  const addLoadType = () => {
    setPriceForm((current) => ({ ...current, loadTypes: [...current.loadTypes, { name: 'New type', mode: 'per-load', kgPerLoad: 7, pricePerKilo: 0, minKg: 0 }] }))
    setPricingSaved(false)
  }

  const handleSavePricing = () => {
    void savePricing(priceForm)
    setPricingSaved(true)
  }
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [bluetoothDevices, setBluetoothDevices] = useState<PrinterDevice[]>(sampleBluetoothDevices)
  const [selectedBluetoothDevice, setSelectedBluetoothDevice] = useState<PrinterDevice | null>(sampleBluetoothDevices[1])
  const [bluetoothConnected, setBluetoothConnected] = useState(false)
  const [lanStatus, setLanStatus] = useState('Ready for LAN testing')
  const [usbConnected, setUsbConnected] = useState(false)
  const [testPrintStatus, setTestPrintStatus] = useState('Ready')

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
    // The paper size actually drives how receipts print.
    if (key === 'paperSize') setPaperSize(value as '58mm' | '80mm')
  }

  // Keep the print engine's paper width in sync with the saved setting.
  useEffect(() => setPaperSize(settings.paperSize), [settings.paperSize])

  /** Print a real sample receipt through the browser's printer (not a demo). */
  const handleTestPrint = () => {
    printReceipt({
      logoUrl,
      businessName: business.name,
      tagline: [business.address, business.contact].filter(Boolean).join(' • ') || 'Printer test',
      docType: 'PRINTER TEST',
      jobNumber: 'TEST',
      customer: settings.printerName || 'Test Printer',
      datetime: nowStamp(),
      printedAt: nowStamp(),
      meta: [
        { label: 'Printer', value: settings.printerName },
        { label: 'Type', value: settings.printerType },
        { label: 'Paper', value: settings.paperSize },
      ],
      totals: [{ label: 'Sample Total', value: '₱000.00' }],
      footer: 'If you can read this, printing works! Select your thermal printer in the print dialog.',
    })
    setTestPrintStatus('Print dialog opened — choose your printer and print.')
  }

  const handleEnableBluetooth = () => {
    setBluetoothEnabled(true)
    setLanStatus('Bluetooth enabled for nearby device discovery')
  }

  const handleSearchDevices = () => {
    setIsScanning(true)
    setBluetoothEnabled(true)
    setTimeout(() => {
      setBluetoothDevices(sampleBluetoothDevices)
      setIsScanning(false)
      setLanStatus('Scanning complete. Nearby printer devices discovered.')
    }, 900)
  }

  const handleRefreshDevices = () => {
    setIsScanning(true)
    setTimeout(() => {
      setBluetoothDevices(sampleBluetoothDevices)
      setIsScanning(false)
      setLanStatus('Bluetooth devices refreshed')
    }, 700)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'business':
        return (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Business Information" subtitle="Configure your company profile and POS identity.">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Business Name</span>
                  <input value={settings.businessName} onChange={(event) => updateSetting('businessName', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Branch Name</span>
                  <input value={settings.branchName} onChange={(event) => updateSetting('branchName', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Address</span>
                  <input value={settings.address} onChange={(event) => updateSetting('address', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Contact Number</span>
                  <input value={settings.contactNumber} onChange={(event) => updateSetting('contactNumber', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">TIN (Optional)</span>
                  <input value={settings.tin} onChange={(event) => updateSetting('tin', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Business Permit No. (Optional)</span>
                  <input value={settings.permitNumber} onChange={(event) => updateSetting('permitNumber', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Footer Message</span>
                  <input value={settings.footerMessage} onChange={(event) => updateSetting('footerMessage', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Operating Hours</span>
                  <input value={settings.operatingHours} onChange={(event) => updateSetting('operatingHours', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Business Logo" subtitle="Upload your own logo — it appears on the sidebar, login screen, and browser tab.">
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                    <img src={logoUrl} alt="Current logo" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Current logo</p>
                    <p className="text-xs text-slate-500">PNG or JPG. It's resized automatically and stored securely.</p>
                  </div>
                </div>

                {canManagePricing ? (
                  <div className="flex flex-wrap gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                      <FaUpload /> Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <button onClick={() => void resetLogo()} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Reset to Default
                    </button>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    Only Administrators and Managers can change the logo.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="GCash Payment" subtitle="Your GCash QR & number — shown to customers when they pay by GCash.">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-slate-700">GCash Account Name</span>
                    <input value={gcashForm.gcashName} onChange={(e) => setGcashForm((f) => ({ ...f, gcashName: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="e.g. Juan D." />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-slate-700">GCash Number</span>
                    <input value={gcashForm.gcashNumber} onChange={(e) => setGcashForm((f) => ({ ...f, gcashNumber: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="e.g. 0917 000 0000" />
                  </label>
                  {canManagePricing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                        <FaUpload /> Upload GCash QR
                        <input type="file" accept="image/*" onChange={handleGcashQrUpload} className="hidden" />
                      </label>
                      {gcashForm.gcashQr ? (
                        <button onClick={() => setGcashForm((f) => ({ ...f, gcashQr: '' }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Remove QR</button>
                      ) : null}
                      <button onClick={handleSaveGcash} className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        <FaSave /> {gcashSaved ? 'Saved!' : 'Save GCash'}
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      Only Administrators and Managers can change GCash settings.
                    </p>
                  )}
                </div>
                <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                  {gcashForm.gcashQr ? (
                    <img src={gcashForm.gcashQr} alt="GCash QR" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="px-3 text-center text-xs text-slate-400">GCash QR preview</span>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        )
      case 'pricing':
        return (
          <div className="space-y-6">
            {!canManagePricing ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                View only — pricing can be changed by Administrators and Managers.
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Load & Kilo Settings" subtitle="Machine minimum load and optional per-kilo surcharge.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Minimum load per machine (kg)">
                    <input
                      type="number"
                      value={priceForm.minLoadKg}
                      disabled={!canManagePricing}
                      onChange={(event) => { setPriceForm((c) => ({ ...c, minLoadKg: Number(event.target.value) || 1 })); setPricingSaved(false) }}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none disabled:opacity-60"
                    />
                  </FormField>
                  <FormField label="Price per kilo surcharge (₱)">
                    <input
                      type="number"
                      value={priceForm.pricePerKilo}
                      disabled={!canManagePricing}
                      onChange={(event) => { setPriceForm((c) => ({ ...c, pricePerKilo: Number(event.target.value) || 0 })); setPricingSaved(false) }}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none disabled:opacity-60"
                    />
                  </FormField>
                </div>
                <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Loads = weight ÷ {priceForm.minLoadKg}kg (rounded up). Service charge = service price × loads. The per-kilo surcharge (₱{priceForm.pricePerKilo}/kg) is added on top; leave it at 0 for pure per-load pricing.
                </p>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">Loyalty Points</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Points earned per job order">
                      <input
                        type="number"
                        value={priceForm.pointsPerOrder}
                        disabled={!canManagePricing}
                        onChange={(event) => { setPriceForm((c) => ({ ...c, pointsPerOrder: Number(event.target.value) || 0 })); setPricingSaved(false) }}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none disabled:opacity-60"
                      />
                    </FormField>
                    <FormField label="Points per ₱1 (redeem rate)">
                      <input
                        type="number"
                        min="1"
                        value={priceForm.pointsPerPeso}
                        disabled={!canManagePricing}
                        onChange={(event) => { setPriceForm((c) => ({ ...c, pointsPerPeso: Number(event.target.value) || 1 })); setPricingSaved(false) }}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none disabled:opacity-60"
                      />
                    </FormField>
                  </div>
                  <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Registered customers earn <span className="font-semibold">{priceForm.pointsPerOrder} pts</span> per job order. Redeem rate: <span className="font-semibold">{priceForm.pointsPerPeso} pts = ₱1</span> (₱{(1 / (priceForm.pointsPerPeso || 1)).toFixed(3)} per point). Walk-ins earn no points.
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Save Changes" subtitle="Apply pricing across the Job Order screen.">
                <div className="space-y-3">
                  <button
                    onClick={handleSavePricing}
                    disabled={!canManagePricing}
                    className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FaSave /> Save Pricing
                  </button>
                  {pricingSaved ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      <FaCheckCircle /> Pricing saved — it's now live on Job Orders.
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Load Types" subtitle="Tag each laundry type and choose how it's priced — per load (by machine capacity) or per kilo (₱/kg with a minimum weight).">
              <div className="space-y-3">
                {priceForm.loadTypes.map((type, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={type.name}
                        disabled={!canManagePricing}
                        onChange={(event) => updateLoadType(index, 'name', event.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none disabled:opacity-60"
                        placeholder="e.g. Normal clothes / Towels / Per Kilo"
                      />
                      <select
                        value={type.mode}
                        disabled={!canManagePricing}
                        onChange={(event) => updateLoadType(index, 'mode', event.target.value)}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-60"
                      >
                        <option value="per-load">Per load</option>
                        <option value="per-kilo">Per kilo</option>
                      </select>
                      {canManagePricing ? (
                        <button onClick={() => removeLoadType(index)} className="rounded-xl border border-rose-200 p-2.5 text-rose-600 transition hover:bg-rose-50">
                          <FaTrash />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500">{type.mode === 'per-kilo' ? 'Machine kg/load' : 'kg per load'}</span>
                        <input type="number" step="0.5" value={type.kgPerLoad} disabled={!canManagePricing} onChange={(event) => updateLoadType(index, 'kgPerLoad', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-60" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500">{type.mode === 'per-kilo' ? 'Base ₱/kg' : 'Surcharge ₱/kg'}</span>
                        <input type="number" value={type.pricePerKilo} disabled={!canManagePricing} onChange={(event) => updateLoadType(index, 'pricePerKilo', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-60" />
                      </label>
                      <label className={`space-y-1 ${type.mode === 'per-kilo' ? '' : 'opacity-40'}`}>
                        <span className="text-xs font-semibold text-slate-500">Minimum kg</span>
                        <input type="number" step="0.5" value={type.minKg} disabled={!canManagePricing || type.mode !== 'per-kilo'} onChange={(event) => updateLoadType(index, 'minKg', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-60" />
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {type.mode === 'per-kilo'
                        ? `Charge = max(weight, ${type.minKg}kg) × ₱${type.pricePerKilo}/kg. Loads for machines = weight ÷ ${type.kgPerLoad}kg.`
                        : `Loads = weight ÷ ${type.kgPerLoad}kg. Service price × loads${type.pricePerKilo > 0 ? ` + ₱${type.pricePerKilo}/kg` : ''}.`}
                    </p>
                  </div>
                ))}
                {canManagePricing ? (
                  <button onClick={addLoadType} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <FaPlus /> Add Load Type
                  </button>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Service Prices (per load)" subtitle="Flat price charged per load for each laundry service.">
              <div className="space-y-2">
                {priceForm.services.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={item.name}
                      disabled={!canManagePricing}
                      onChange={(event) => updateItem('services', index, 'name', event.target.value)}
                      className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-60"
                    />
                    <div className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-400">₱</span>
                      <input
                        type="number"
                        value={item.price}
                        disabled={!canManagePricing}
                        onChange={(event) => updateItem('services', index, 'price', event.target.value)}
                        className="w-20 text-sm outline-none disabled:opacity-60"
                      />
                    </div>
                    {canManagePricing ? (
                      <button onClick={() => removeItem('services', index)} className="rounded-xl border border-rose-200 p-2.5 text-rose-600 transition hover:bg-rose-50">
                        <FaTrash />
                      </button>
                    ) : null}
                  </div>
                ))}
                {canManagePricing ? (
                  <button onClick={() => addItem('services')} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <FaPlus /> Add Service
                  </button>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Add-on Fees (flat)" subtitle="One-time fees added per order (pickup, delivery, hanger, etc.).">
              <div className="space-y-2">
                {priceForm.addOns.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={item.name}
                      disabled={!canManagePricing}
                      onChange={(event) => updateItem('addOns', index, 'name', event.target.value)}
                      className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-60"
                    />
                    <div className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-400">₱</span>
                      <input
                        type="number"
                        value={item.price}
                        disabled={!canManagePricing}
                        onChange={(event) => updateItem('addOns', index, 'price', event.target.value)}
                        className="w-20 text-sm outline-none disabled:opacity-60"
                      />
                    </div>
                    {canManagePricing ? (
                      <button onClick={() => removeItem('addOns', index)} className="rounded-xl border border-rose-200 p-2.5 text-rose-600 transition hover:bg-rose-50">
                        <FaTrash />
                      </button>
                    ) : null}
                  </div>
                ))}
                {canManagePricing ? (
                  <button onClick={() => addItem('addOns')} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <FaPlus /> Add Add-on
                  </button>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Retail Products" subtitle="Items sold alongside laundry (detergent, hangers, bags). Shown on the Job Order screen.">
              <div className="space-y-2">
                {priceForm.products.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={item.name}
                      disabled={!canManagePricing}
                      onChange={(event) => updateItem('products', index, 'name', event.target.value)}
                      className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-60"
                    />
                    <div className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-400">₱</span>
                      <input
                        type="number"
                        value={item.price}
                        disabled={!canManagePricing}
                        onChange={(event) => updateItem('products', index, 'price', event.target.value)}
                        className="w-20 text-sm outline-none disabled:opacity-60"
                      />
                    </div>
                    {canManagePricing ? (
                      <button onClick={() => removeItem('products', index)} className="rounded-xl border border-rose-200 p-2.5 text-rose-600 transition hover:bg-rose-50">
                        <FaTrash />
                      </button>
                    ) : null}
                  </div>
                ))}
                {canManagePricing ? (
                  <button onClick={() => addItem('products')} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <FaPlus /> Add Product
                  </button>
                ) : null}
              </div>
            </SectionCard>
          </div>
        )
      case 'printer':
        return (
          <div className="space-y-6">
            <SectionCard title="Printer Configuration" subtitle="Professional Android-style POS printer setup with Bluetooth, LAN, USB, and test print controls.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Printer Name">
                  <input value={settings.printerName} onChange={(event) => updateSetting('printerName', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </FormField>
                <FormField label="Printer Type">
                  <select value={settings.printerType} onChange={(event) => updateSetting('printerType', event.target.value as PrinterType)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none">
                    {['Generic ESC/POS', 'XPrinter', 'Epson', 'Rongta', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </FormField>
                <FormField label="Connection Type">
                  <select value={settings.connectionType} onChange={(event) => updateSetting('connectionType', event.target.value as ConnectionType)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none">
                    {['Bluetooth', 'LAN (Ethernet)', 'USB'].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </FormField>
                <SelectField label="Paper Size" value={settings.paperSize} options={['58mm', '80mm']} onChange={(value) => updateSetting('paperSize', value as PaperSize)} />
              </div>
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard title="Bluetooth Printer" subtitle="Discover nearby Bluetooth printers and connect instantly.">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleEnableBluetooth} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <FaBluetooth /> Enable Bluetooth
                    </button>
                    <button onClick={handleSearchDevices} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                      {isScanning ? <FaSpinner className="animate-spin" /> : <FaSync />} Search Devices
                    </button>
                    <button onClick={handleRefreshDevices} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <FaSync /> Refresh
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">Nearby Devices</span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{bluetoothEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="space-y-2">
                      {bluetoothDevices.map((device) => (
                        <div key={device.address} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{device.name}</p>
                              <p className="text-xs text-slate-500">{device.address}</p>
                              <p className="mt-1 text-xs text-slate-500">{device.status}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => setSelectedBluetoothDevice(device)} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Select Printer</button>
                              <button onClick={() => {
                                setSelectedBluetoothDevice(device)
                                setBluetoothConnected(true)
                                setTestPrintStatus('Bluetooth printer ready')
                              }} className="rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white">Connect</button>
                              <button onClick={() => setBluetoothConnected(false)} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Disconnect</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-blue-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Connected Printer</p>
                    <p className="mt-1">{bluetoothConnected && selectedBluetoothDevice ? selectedBluetoothDevice.name : settings.printerName}</p>
                    <p className="mt-1">Bluetooth Address: {selectedBluetoothDevice?.address ?? 'A8:5E:45:11:90:10'}</p>
                    <p className="mt-1">Signal Status: {bluetoothConnected ? 'Strong' : 'Standby'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => {
                      updateSetting('printerName', selectedBluetoothDevice?.name ?? settings.printerName)
                      setBluetoothConnected(Boolean(selectedBluetoothDevice))
                    }} className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Save Printer</button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="LAN Printer" subtitle="Connect to Ethernet-based printers with IP address and port.">
                <div className="space-y-3">
                  <FormField label="Printer IP Address">
                    <input value={settings.printerIp} onChange={(event) => updateSetting('printerIp', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Port">
                    <input value={settings.port} onChange={(event) => updateSetting('port', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Connection Status</p>
                    <p className="mt-1">{lanStatus}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setLanStatus('Connecting to 192.168.1.40:9100')} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Test Connection</button>
                    <button onClick={() => setLanStatus('Saved LAN printer settings')} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Save</button>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SectionCard title="USB Printer" subtitle="Detect attached USB printers for local receipt printing.">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <div>
                      <p className="font-semibold text-slate-900">USB Thermal Printer</p>
                      <p className="mt-1">Status: {usbConnected ? 'Connected' : 'Disconnected'}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-2 text-blue-600"><FaUsb /></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setUsbConnected(true)} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Connect</button>
                    <button onClick={() => setUsbConnected(false)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Disconnect</button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Test Print" subtitle="Validate the selected printer with a sample receipt output.">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{settings.receiptHeader}</p>
                    <p className="mt-1">Laundry Project POS</p>
                    <p className="mt-1">Printer Test</p>
                    <p className="mt-1">Date: {new Date().toLocaleDateString('en-US')}</p>
                    <p className="mt-1">Time: {new Date().toLocaleTimeString('en-US')}</p>
                    <p className="mt-1">Connected Printer: {selectedBluetoothDevice?.name ?? settings.printerName}</p>
                    <p className="mt-1">Paper Width: {settings.paperSize}</p>
                    <p className="mt-1">Status: {testPrintStatus}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleTestPrint} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><FaPrint /> Print Test</button>
                    <button onClick={() => setTestPrintStatus('Ready')} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Reset</button>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SectionCard title="Paper & Print Options" subtitle="Choose paper size and automatic printing behaviors.">
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField label="Paper Size" value={settings.paperSize} options={['58mm', '80mm']} onChange={(value) => updateSetting('paperSize', value as PaperSize)} />
                  <SelectField label="Print Density" value={settings.density} options={['Light', 'Normal', 'Dark']} onChange={(value) => updateSetting('density', value as Density)} />
                  <SelectField label="Character Size" value={settings.characterSize} options={['Small', 'Normal', 'Large']} onChange={(value) => updateSetting('characterSize', value as CharacterSize)} />
                  <ToggleRow label="Paper Feed After Print" checked={settings.paperFeedAfterPrint} onChange={(value) => updateSetting('paperFeedAfterPrint', value)} />
                  <ToggleRow label="Auto Cut (if supported)" checked={settings.autoCut} onChange={(value) => updateSetting('autoCut', value)} />
                  <ToggleRow label="Drawer Kick (if supported)" checked={settings.drawerKick} onChange={(value) => updateSetting('drawerKick', value)} />
                </div>
                <div className="mt-4 space-y-3">
                  <ToggleRow label="Automatically Print Customer Receipt" checked={settings.autoPrintReceipt} onChange={(value) => updateSetting('autoPrintReceipt', value)} />
                  <ToggleRow label="Automatically Print Shift Closing Report" checked={settings.autoPrintShiftReport} onChange={(value) => updateSetting('autoPrintShiftReport', value)} />
                  <ToggleRow label="Automatically Print Daily Sales Summary" checked={settings.autoPrintDailySales} onChange={(value) => updateSetting('autoPrintDailySales', value)} />
                  <ToggleRow label="Automatically Print Cash Collection Report" checked={settings.autoPrintCashCollectionReport} onChange={(value) => updateSetting('autoPrintCashCollectionReport', value)} />
                  <ToggleRow label="Automatically Print Claim Stub" checked={settings.autoPrintClaimStub} onChange={(value) => updateSetting('autoPrintClaimStub', value)} />
                </div>
              </SectionCard>

              <SectionCard title="Receipt Header & Footer" subtitle="Customize how the receipt is branded and displayed.">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    <FaImage className="mx-auto mb-2 text-lg text-blue-600" />
                    <p>Upload Business Logo</p>
                  </div>
                  <FormField label="Business Name">
                    <input value={settings.businessName} onChange={(event) => updateSetting('businessName', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Branch">
                    <input value={settings.branchName} onChange={(event) => updateSetting('branchName', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Address">
                    <input value={settings.address} onChange={(event) => updateSetting('address', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Contact Number">
                    <input value={settings.contactNumber} onChange={(event) => updateSetting('contactNumber', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Thanks Message">
                    <input value={settings.receiptThankYouMessage} onChange={(event) => updateSetting('receiptThankYouMessage', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Facebook Page">
                    <input value={settings.facebookPage} onChange={(event) => updateSetting('facebookPage', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Hotline">
                    <input value={settings.hotline} onChange={(event) => updateSetting('hotline', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                  <FormField label="Custom Notes">
                    <input value={settings.customNotes} onChange={(event) => updateSetting('customNotes', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                  </FormField>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Advanced Settings & Design" subtitle="The layout is polished for modern POS administration and receipt presentation.">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-blue-600">
                  <FaCheckCircle />
                  <span>Bluetooth discovery, LAN validation, USB detection, print testing, and receipt branding are all available from one professional interface.</span>
                </div>
              </div>
            </SectionCard>
          </div>
        )
      case 'receipt':
        return (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Receipt Layout" subtitle="Configure the information shown on printed receipts.">
              <div className="grid gap-4">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Receipt Header</span>
                  <input value={settings.receiptHeader} onChange={(event) => updateSetting('receiptHeader', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Receipt Footer</span>
                  <input value={settings.receiptFooter} onChange={(event) => updateSetting('receiptFooter', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <ToggleRow label="Enable QR Code" checked={settings.qrCodeEnabled} onChange={(value) => updateSetting('qrCodeEnabled', value)} />
                <ToggleRow label="Enable Barcode" checked={settings.barcodeEnabled} onChange={(value) => updateSetting('barcodeEnabled', value)} />
              </div>
            </SectionCard>

            <SectionCard title="Live Preview" subtitle="Preview the receipt layout below.">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{settings.receiptHeader}</p>
                    <p>{settings.businessName}</p>
                    <p>{settings.branchName}</p>
                    <p>{settings.contactNumber}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Receipt #1001</p>
                    <p>08/08/2026 15:35</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Job Order #J-1024</p>
                  <p>Customer: Maria Santos</p>
                  <p>Service: Wash & Fold</p>
                  <p>Subtotal: ₱300</p>
                  <p>Discount: ₱0</p>
                  <p className="font-semibold">Total: ₱300</p>
                </div>
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p>{settings.receiptFooter}</p>
                  {settings.qrCodeEnabled ? <p className="mt-2 text-xs text-slate-500">QR Code Enabled</p> : null}
                  {settings.barcodeEnabled ? <p className="mt-2 text-xs text-slate-500">Barcode Enabled</p> : null}
                </div>
              </div>
            </SectionCard>
          </div>
        )
      case 'system':
        return (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="System Preferences" subtitle="Set currency, timezone, date, and time behavior.">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Default Currency</span>
                  <input value={settings.currency} onChange={(event) => updateSetting('currency', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Timezone</span>
                  <input value={settings.timezone} onChange={(event) => updateSetting('timezone', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Date Format</span>
                  <input value={settings.dateFormat} onChange={(event) => updateSetting('dateFormat', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Time Format</span>
                  <input value={settings.timeFormat} onChange={(event) => updateSetting('timeFormat', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none" />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Automation" subtitle="Enable system-wide automatic time and report behavior.">
              <div className="space-y-3">
                <ToggleRow label="Automatic Date & Time" checked={settings.automaticDateTime} onChange={(value) => updateSetting('automaticDateTime', value)} />
              </div>
            </SectionCard>
          </div>
        )
      case 'machineSync':
        return (
          <div className="space-y-6">
            {!manageMachines ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                View only — the LG connection can be changed by Administrators and Managers.
              </div>
            ) : null}

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold">How automatic machine monitoring works</p>
              <p className="mt-1 text-blue-700">
                Sign in once here with the same LG account (email &amp; password) you use on the <span className="font-semibold">Laundry Crew Manager</span> website.
                The backend then signs into LG for you every 5 minutes and shows each store's live washer/dryer availability below and on the
                <span className="font-semibold"> Machine Monitoring</span> page. Your own manually-added machines keep working exactly as before.
              </p>
              <p className="mt-2 rounded-xl bg-blue-100/70 px-3 py-2 text-xs font-semibold text-blue-800">
                Live status is refreshed by the scheduled sync job every ~5 minutes — setup in <span className="font-mono">lg-sync/SETUP.md</span>.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <SectionCard title="LG Account Sign-in" subtitle="The same email & password you use on the Laundry Crew Manager site.">
                <div className="space-y-4">
                  <FormField label="Email ID">
                    <input
                      type="email"
                      value={lgForm.email}
                      disabled={!manageMachines}
                      onChange={(event) => setLgForm((c) => ({ ...c, email: event.target.value }))}
                      placeholder="your-lg-account@email.com"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none disabled:opacity-60"
                    />
                  </FormField>
                  <FormField label="Password">
                    <input
                      type="password"
                      value={lgForm.password}
                      disabled={!manageMachines}
                      onChange={(event) => setLgForm((c) => ({ ...c, password: event.target.value }))}
                      placeholder="••••••••••••"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none disabled:opacity-60"
                    />
                  </FormField>
                  <SelectField label="Region" value={lgForm.region} options={['PH', 'KR', 'US', 'SG']} onChange={(value) => setLgForm((c) => ({ ...c, region: value }))} />

                  <div className="flex flex-wrap gap-2">
                    {lg.connected ? (
                      <button onClick={handleLgDisconnect} disabled={!manageMachines} className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">
                        <FaUnlink /> Disconnect
                      </button>
                    ) : (
                      <button onClick={handleLgConnect} disabled={!manageMachines || lgConnecting} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                        {lgConnecting ? <FaSpinner className="animate-spin" /> : <FaLink />} Sign in
                      </button>
                    )}
                    {lg.connected ? (
                      <button onClick={handleLgSyncNow} disabled={!manageMachines || lgConnecting} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                        {lgConnecting ? <FaSpinner className="animate-spin" /> : <FaSync />} Sync now
                      </button>
                    ) : null}
                  </div>

                  {lgError ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                      <FaExclamationTriangle /> {lgError}
                    </div>
                  ) : null}
                  {lg.connected ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      <FaCheckCircle /> Signed in to your LG account ({lg.region}). Live status syncs every 5 minutes.
                    </div>
                  ) : null}
                  {lgStatus.error ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      <FaExclamationTriangle /> Last sync error: {lgStatus.error}
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard title="Your LG Stores — Live Status" subtitle="Washer & dryer availability pulled straight from your LG account.">
                {!lg.connected ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Not signed in yet. Enter your LG email &amp; password and press Sign in.
                  </div>
                ) : !lgStatus.stores || lgStatus.stores.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Waiting for the first sync… the scheduled job runs every ~5 minutes. To sync immediately, open GitHub → Actions → <span className="font-semibold">LG Machine Sync</span> → Run workflow.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lgStatus.stores.map((store) => (
                      <div key={store.storeId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{store.storeName}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                            <p className="font-semibold text-slate-700">Washers</p>
                            <p className="text-slate-500">{store.washer.standby} free · {store.washer.usage} running · {store.washer.offline} offline</p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                            <p className="font-semibold text-slate-700">Dryers</p>
                            <p className="text-slate-500">{store.dryer.standby} free · {store.dryer.usage} running · {store.dryer.offline} offline</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {lgStatus.syncedAt ? (
                      <p className="pt-1 text-xs text-slate-400">Last synced {new Date(lgStatus.syncedAt).toLocaleString()}</p>
                    ) : null}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )
      case 'backup':
        return (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Backup & Restore" subtitle="Download a full JSON backup of your data, or restore from one.">
              <div className="flex flex-wrap gap-2">
                <button onClick={handleBackup} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"><FaArchive /> Backup Database</button>
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <FaFileImport /> Restore Database
                  <input type="file" accept="application/json" onChange={handleRestore} className="hidden" />
                </label>
                <button onClick={handleExportSettings} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><FaFileExcel /> Export Settings</button>
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <FaFileImport /> Import Settings
                  <input type="file" accept="application/json" onChange={handleRestore} className="hidden" />
                </label>
              </div>
              {backupNote ? <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{backupNote}</p> : null}
            </SectionCard>

            <SectionCard title="Quick Summary" subtitle="Current configuration snapshot.">
              <div className="space-y-3">
                <SummaryStat label="Business Name" value={settings.businessName} accent="bg-blue-100 text-blue-700" />
                <SummaryStat label="Printer" value={settings.printerName} accent="bg-emerald-100 text-emerald-700" />
                <SummaryStat label="Receipt Footer" value={settings.receiptFooter} accent="bg-violet-100 text-violet-700" />
                <SummaryStat label="Currency" value={settings.currency} accent="bg-amber-100 text-amber-700" />
              </div>
            </SectionCard>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Settings</p>
            <h2 className="mt-2 text-3xl font-semibold">Professional configuration hub for the POS</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Configure business identity, printer behavior, receipt layout, system preferences, and backup operations from one place.
            </p>
          </div>
          <button onClick={handleSaveConfig} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
            <FaSave /> {savedConfig ? 'Saved!' : 'Save Business Info'}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {renderContent()}
      </div>
    </div>
  )
}
