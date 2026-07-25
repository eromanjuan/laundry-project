import { FaHistory, FaTimes } from 'react-icons/fa'
import type { ActivityRecord } from '../data/seeds'
import type { WithDocId } from '../hooks/useCollection'

interface ActivityLogModalProps {
  isOpen: boolean
  entries: Array<ActivityRecord & WithDocId>
  onClose: () => void
}

export function ActivityLogModal({ isOpen, entries, onClose }: ActivityLogModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            <h3 className="text-xl font-semibold text-slate-900">Activity Log</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
            <FaTimes />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Every stage change and payment, with who made it.</p>

        <div className="mt-5 flex-1 space-y-2 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No activity recorded yet.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry._docId ?? entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-800">{entry.action}</p>
                <p className="mt-0.5 text-xs text-slate-500">{entry.user} • {entry.at}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
