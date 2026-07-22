import { FaArrowRight } from 'react-icons/fa'

interface PlaceholderPageProps {
  title: string
  subtitle: string
  description: string
}

export function PlaceholderPage({ title, subtitle, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-100">Module Ready</p>
        <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm text-blue-50/90">{subtitle}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <h3 className="text-xl font-semibold text-slate-900">Professional placeholder layout</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-600">
            Next step <FaArrowRight />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm shadow-slate-200/60">
          <h3 className="text-lg font-semibold text-slate-900">Implementation checklist</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>• Add data tables and forms</li>
            <li>• Connect to offline persistence</li>
            <li>• Add workflow actions and validation</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

export default PlaceholderPage
