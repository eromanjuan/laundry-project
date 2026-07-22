import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'

interface MachineStatusItem {
  name: string
  state: 'Running' | 'Idle' | 'Finished'
}

interface MachineStatusListProps {
  machines: MachineStatusItem[]
}

export function MachineStatusList({ machines }: MachineStatusListProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Machine Status</h3>
          <p className="text-sm text-slate-500">Live equipment readiness</p>
        </div>
        <button onClick={() => navigate('/lg-machine-status')} className="text-sm font-semibold text-blue-600">
          Open LG Module
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {machines.map((machine) => (
          <div
            key={machine.name}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60"
          >
            <span className="font-medium text-slate-800">{machine.name}</span>
            <StatusBadge
              label={machine.state}
              tone={machine.state === 'Running' ? 'green' : machine.state === 'Finished' ? 'blue' : 'amber'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
