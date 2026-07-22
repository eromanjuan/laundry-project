interface ToggleOptionProps {
  label: string
  checked: boolean
  onChange: () => void
}

export function ToggleOption({ label, checked, onChange }: ToggleOptionProps) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/60">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
    </label>
  )
}
