import { useMemo, useState } from 'react'
import { FaBatteryFull, FaClock, FaConnectdevelop, FaLink, FaRefresh, FaServer, FaSync, FaTools, FaTshirt, FaWifi } from 'react-icons/fa'
import { getLGMachineSummary, getOfflineLGMachineSummary, syncLGMachineStatus, type LGMachineSummary } from '../services/lgMachineSync'

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

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'blue' | 'amber' | 'red' | 'slate' }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>
}

export function LGMachineStatusPage() {
  const [summary, setSummary] = useState<LGMachineSummary>(() => getLGMachineSummary())
  const [isConnecting, setIsConnecting] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)

  const metrics = useMemo(() => [
    { label: 'Washers Running', value: summary.washersRunning, accent: 'bg-cyan-100 text-cyan-700' },
    { label: 'Dryers Running', value: summary.dryersRunning, accent: 'bg-emerald-100 text-emerald-700' },
    { label: 'Machines Available', value: summary.machinesAvailable, accent: 'bg-blue-100 text-blue-700' },
    { label: 'Machines Finished', value: summary.machinesFinished, accent: 'bg-violet-100 text-violet-700' },
    { label: 'Machines Offline', value: summary.machinesOffline, accent: 'bg-amber-100 text-amber-700' },
  ], [summary])

  const handleConnect = () => {
    setIsConnecting(true)
    setTimeout(() => {
      setSummary(syncLGMachineStatus())
      setOfflineMode(false)
      setIsConnecting(false)
    }, 900)
  }

  const handleSync = () => {
    setSummary(syncLGMachineStatus())
  }

  const handleOffline = () => {
    setSummary(getOfflineLGMachineSummary())
    setOfflineMode(true)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">LG Machine Status</p>
            <h2 className="mt-2 text-3xl font-semibold">Live LG Smart Laundry machine monitoring</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Connect your LG Smart Laundry account, sync machine status, and keep the dashboard updated with real-time equipment information.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-blue-50">
            {summary.connectionStatus === 'Connected' ? 'Connected Store' : 'Offline'}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="LG Smart Laundry Connection" subtitle="Connect your store and sync machine activity from the LG service.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Connection Status</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.connectionStatus}</p>
              <p className="mt-1 text-sm text-slate-500">Last Sync: {summary.lastSync}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Connected Store</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{summary.connectedStore}</p>
              <p className="mt-1 text-sm text-slate-500">{summary.washers} washers • {summary.dryers} dryers</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-blue-50 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-blue-700">
              <FaLink /> Connect LG Smart Laundry
            </div>
            <p className="mt-2">Open <span className="font-semibold">https://kic-laundry-web.lgthinq.com/init</span> to sign in and select a store location.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleConnect} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                {isConnecting ? 'Connecting…' : 'Connect Store'}
              </button>
              <button onClick={handleOffline} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Simulate Offline</button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Sync Controls" subtitle="Refresh machine activity and manage automatic syncing behavior.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={handleSync} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><FaSync /> Sync Now</button>
              <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><FaExchangeAlt /> Auto Sync</button>
              <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><FaRefresh /> Refresh</button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Sync Status</p>
              <p className="mt-1">Last Successful Sync: {summary.lastSuccessfulSync}</p>
              <p className="mt-1">Last Failed Sync: {summary.lastFailedSync ?? 'None'}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className={`rounded-2xl border border-slate-200 p-4 ${metric.accent}`}>
            <p className="text-sm font-medium">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Live Machine Status" subtitle="Display current washer and dryer activity for the connected LG store.">
        <div className="grid gap-4 lg:grid-cols-2">
          {summary.machines.map((machine) => (
            <div key={machine.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{machine.name}</p>
                  <p className="text-sm text-slate-500">{machine.type}</p>
                </div>
                <StatusBadge label={machine.status} tone={machine.status === 'Running' ? 'green' : machine.status === 'Finished' ? 'blue' : machine.status === 'Available' ? 'amber' : 'red'} />
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {machine.remainingTime ? <p className="flex items-center gap-2"><FaClock /> {machine.remainingTime}</p> : null}
                {machine.cycle ? <p className="flex items-center gap-2"><FaTools /> {machine.cycle}</p> : null}
                {machine.status === 'Running' ? <p className="flex items-center gap-2"><FaBatteryFull /> {machine.detail}</p> : null}
                {machine.status === 'Available' ? <p className="flex items-center gap-2"><FaTshirt /> {machine.detail}</p> : null}
                {machine.status === 'Finished' ? <p className="flex items-center gap-2"><FaServer /> {machine.detail}</p> : null}
                {machine.status === 'Offline' ? <p className="flex items-center gap-2"><FaWifi /> {machine.detail}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {offlineMode ? (
        <SectionCard title="LG Smart Laundry Offline" subtitle="The LG service could not be reached. Retry to reconnect.">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <FaWifi className="text-lg" />
            <span>LG Smart Laundry Offline</span>
            <button onClick={handleConnect} className="rounded-2xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Retry Connection</button>
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}
