'use client'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import MobileDrawer from './components/MobileDrawer'
import Composer from './screens/Composer'
import Accounts from './screens/Accounts'
import Calendar from './screens/Calendar'
import History from './screens/History'
import Toast from './components/Toast'
import { api } from './lib/api'

export default function App() {
  const [page, setPage] = useState('composer')
  const [toasts, setToasts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [metaSession, setMetaSession] = useState(null) // { pages, token, instagramOnly }

  useEffect(() => {
    loadAccounts()
    handleOAuthRedirect()
  }, [])

  async function loadAccounts() {
    const data = await api.listAccounts()
    setAccounts(data || [])
  }

  // Reads ?oauth=... query params set by the OAuth callback redirect
  async function handleOAuthRedirect() {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const oauth = url.searchParams.get('oauth')
    if (!oauth) return

    // Clean URL right away so a reload doesn't re-trigger
    url.searchParams.delete('oauth')
    const platform = url.searchParams.get('platform'); url.searchParams.delete('platform')
    const name     = url.searchParams.get('name');     url.searchParams.delete('name')
    const message  = url.searchParams.get('message');  url.searchParams.delete('message')
    const session  = url.searchParams.get('session');  url.searchParams.delete('session')
    window.history.replaceState({}, '', url.toString())

    if (oauth === 'success') {
      addToast(`${platform || 'Compte'} connecté${name ? ` (${name})` : ''} !`, 'success')
      loadAccounts()
    } else if (oauth === 'meta-select' && session) {
      const r = await api.getMetaSession(session)
      if (r.error) addToast(r.error, 'error')
      else {
        setMetaSession({ pages: r.pages, token: r.token, instagramOnly: r.instagramOnly })
        setPage('accounts')
      }
    } else if (oauth === 'error') {
      addToast(message || 'Erreur OAuth', 'error')
    }
  }

  function addToast(message, type = 'success') {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  const pageProps = { accounts, reloadAccounts: loadAccounts, addToast, metaSession, setMetaSession }

  return (
    <div className="flex h-[100dvh] bg-ivory-100 text-warm-700 overflow-hidden">
      {/* Desktop sidebar (hidden on mobile) */}
      <div className="hidden md:flex">
        <Sidebar currentPage={page} setPage={setPage} accounts={accounts} />
      </div>

      {/* Mobile drawer (hidden on desktop) */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentPage={page}
        setPage={setPage}
        accounts={accounts}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-ivory-50">
        {/* Mobile header with hamburger */}
        <MobileHeader
          accounts={accounts}
          currentPage={page}
          onOpenMenu={() => setDrawerOpen(true)}
        />

        {/* Page content with safe-area padding for iOS */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {page === 'composer' && <Composer {...pageProps} />}
          {page === 'accounts' && <Accounts {...pageProps} />}
          {page === 'queue' && <Calendar {...pageProps} />}
          {page === 'history' && <History {...pageProps} />}
        </div>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-6 right-4 md:right-6 left-4 md:left-auto flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast message={t.message} type={t.type} />
          </div>
        ))}
      </div>
    </div>
  )
}
