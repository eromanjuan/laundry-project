interface ExpenseChartsProps {
  monthly: number[]
  categories: Array<{ label: string; value: number }>
}

export function ExpenseCharts({ monthly, categories }: ExpenseChartsProps) {
  const max = Math.max(...monthly, 1)

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <h3 className="text-lg font-semibold text-slate-900">Monthly Expense Trend</h3>
        <div className="mt-5 flex h-48 items-end gap-2">
          {monthly.map((value, index) => (
            <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-blue-600 to-blue-300" style={{ height: `${(value / max) * 100}%` }} />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <h3 className="text-lg font-semibold text-slate-900">Expense by Category</h3>
        <div className="mt-5 space-y-3">
          {categories.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                <span>{item.label}</span>
                <span className="font-semibold text-slate-900">₱{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min((item.value / 1000) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
