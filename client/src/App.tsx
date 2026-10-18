import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

/** Shown while a code-split page chunk downloads. */
function RouteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="text-sm font-semibold">Loading…</span>
      </div>
    </div>
  )
}

function App() {
  // Route components are lazy, so a Suspense boundary has to sit above the
  // router. Error handling is already handled per-route by `errorElement`.
  return (
    <Suspense fallback={<RouteLoading />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}

export default App