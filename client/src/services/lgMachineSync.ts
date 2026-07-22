export type LGMachineStatus = 'Running' | 'Available' | 'Finished' | 'Offline'

export interface LGMachineItem {
  id: string
  name: string
  type: 'Washer' | 'Dryer'
  status: LGMachineStatus
  remainingTime?: string
  cycle?: string
  detail: string
}

export interface LGMachineSummary {
  washersRunning: number
  dryersRunning: number
  machinesAvailable: number
  machinesFinished: number
  machinesOffline: number
  lastUpdated: string
  connectionStatus: 'Connected' | 'Offline' | 'Disconnected'
  connectedStore: string
  storeName: string
  washers: number
  dryers: number
  lastSync: string
  lastSuccessfulSync: string
  lastFailedSync?: string
  machines: LGMachineItem[]
}

const baseMachines: LGMachineItem[] = [
  { id: 'w1', name: 'Washer 1', type: 'Washer', status: 'Running', remainingTime: '12 minutes', cycle: 'Cycle 15', detail: 'Spin cycle in progress' },
  { id: 'w2', name: 'Washer 2', type: 'Washer', status: 'Available', detail: 'Ready for new load' },
  { id: 'w3', name: 'Washer 3', type: 'Washer', status: 'Finished', detail: 'Waiting for unload' },
  { id: 'd1', name: 'Dryer 1', type: 'Dryer', status: 'Running', remainingTime: '8 minutes', cycle: 'Cycle 8', detail: 'Heat cycle in progress' },
  { id: 'd2', name: 'Dryer 2', type: 'Dryer', status: 'Finished', detail: 'Waiting for unload' },
  { id: 'd3', name: 'Dryer 3', type: 'Dryer', status: 'Offline', detail: 'Maintenance scheduled' },
]

const baseSummary: LGMachineSummary = {
  washersRunning: 1,
  dryersRunning: 1,
  machinesAvailable: 1,
  machinesFinished: 2,
  machinesOffline: 1,
  lastUpdated: 'Just now',
  connectionStatus: 'Connected',
  connectedStore: 'Main Street Branch',
  storeName: 'Main Street Branch',
  washers: 3,
  dryers: 3,
  lastSync: 'Just now',
  lastSuccessfulSync: 'Just now',
  lastFailedSync: undefined,
  machines: baseMachines,
}

export function getLGMachineSummary(overrides: Partial<LGMachineSummary> = {}): LGMachineSummary {
  return {
    ...baseSummary,
    ...overrides,
    machines: overrides.machines ?? baseMachines.map((machine) => ({ ...machine })),
  }
}

export function syncLGMachineStatus(overrides: Partial<LGMachineSummary> = {}): LGMachineSummary {
  const now = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return getLGMachineSummary({
    ...overrides,
    lastSync: now,
    lastSuccessfulSync: now,
    lastUpdated: now,
    lastFailedSync: undefined,
    connectionStatus: overrides.connectionStatus ?? 'Connected',
  })
}

export function getOfflineLGMachineSummary(overrides: Partial<LGMachineSummary> = {}): LGMachineSummary {
  return getLGMachineSummary({
    ...overrides,
    connectionStatus: 'Offline',
    lastFailedSync: 'Unable to reach LG Smart Laundry service',
    lastSync: 'Last attempt failed',
    lastSuccessfulSync: 'No recent successful sync',
    lastUpdated: 'Offline',
  })
}
