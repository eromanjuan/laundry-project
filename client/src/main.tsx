import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

// NOTE: the old single-tenant seeder was removed. Every tenant record now carries
// a `shopId`, so sample data can't be written to the shared top-level
// collections. A default shop and its data are created by the one-time
// multi-tenant migration (see scripts/migrate-multitenant.mjs).

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
