import { useState } from 'react'
import { FaArchive, FaBluetooth, FaCheckCircle, FaFileExcel, FaFileImport, FaImage, FaPrint, FaSave, FaSpinner, FaSync, FaUpload, FaUsb } from 'react-icons/fa'
import { SummaryStat } from '../components/SummaryStat'

type TabKey = 'business' | 'printer' | 'receipt' | 'system' | 'backup'

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
  { key: 'printer', label: 'Printer Settings' },
  { key: 'receipt', label: 'Receipt Layout' },
  { key: 'system', label: 'System Settings' },
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

            <SectionCard title="Business Branding" subtitle="Upload and preview the business identity displayed on receipts and history summaries.">
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  <FaUpload className="mx-auto mb-3 text-xl text-blue-600" />
                  <p>Upload Business Logo</p>
                  <button className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Choose File</button>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Preview</p>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-lg font-semibold text-slate-900">{settings.businessName}</p>
                    <p className="text-sm text-slate-600">{settings.branchName}</p>
                    <p className="text-sm text-slate-500">{settings.address}</p>
                    <p className="mt-2 text-sm text-slate-500">{settings.footerMessage}</p>
                  </div>
                </div>
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
                    <button onClick={() => setTestPrintStatus('Printed successfully')} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><FaPrint /> Print Test</button>
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
      case 'backup':
        return (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Backup & Restore" subtitle="Safeguard the configuration and data files.">
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><FaArchive /> Backup Database</button>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><FaFileImport /> Restore Database</button>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><FaFileExcel /> Export Settings</button>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><FaFileImport /> Import Settings</button>
              </div>
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
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-blue-50">
            <FaSave /> Save Configuration
          </div>
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
