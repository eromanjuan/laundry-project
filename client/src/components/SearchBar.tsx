import { FaSearch } from 'react-icons/fa'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search customers' }: SearchBarProps) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 shadow-sm transition focus-within:border-blue-400 focus-within:bg-white">
      <FaSearch className="text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border-none bg-transparent outline-none placeholder:text-slate-400"
        placeholder={placeholder}
        aria-label="Search customers"
      />
    </label>
  )
}
