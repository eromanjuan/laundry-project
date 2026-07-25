import { Component, useState, type ReactNode } from 'react'
import { useRouteError } from 'react-router-dom'
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa'

/** Friendly full-screen error UI shared by the boundary and router error element. */
export function ErrorScreen({ message }: { message?: string }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fee2e2,_#f8fafc_55%)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-2xl text-rose-600">
          <FaExclamationTriangle />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">
          An unexpected error occurred. Reloading usually fixes it. If it keeps happening, let us know.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <FaRedo /> Reload App
        </button>

        {message ? (
          <div className="mt-4">
            <button onClick={() => setShowDetails((value) => !value)} className="text-xs font-semibold text-slate-400 underline">
              {showDetails ? 'Hide' : 'Show'} technical details
            </button>
            {showDetails ? (
              <pre className="mt-2 max-h-40 overflow-auto rounded-2xl bg-slate-50 p-3 text-left text-xs text-slate-500">{message}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Router error element — catches errors thrown inside route components. */
export function RouteError() {
  const error = useRouteError()
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  return <ErrorScreen message={message} />
}

/** Class boundary — catches render errors anywhere in the tree. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen message={this.state.error.stack ?? this.state.error.message} />
    }
    return this.props.children
  }
}
