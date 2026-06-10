'use client'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import MobileDrawer from './components/MobileDrawer'
import Composer from './screens/Composer'
import Stories from './screens/Stories'
import Accounts from './screens/Accounts'
import Calendar from './screens/Calendar'
import History from './screens/History'
import Analytics from './screens/Analytics'
import Replies from './screens/Replies'
import Inbox from './screens/Inbox'
import Invitations from './screens/Invitations'
import AdminUsers from './screens/AdminUsers'
import AdminStats from './screens/AdminStats'
import AdminAudit from './screens/AdminAudit'
import UserSettings from './screens/UserSettings'
import Toast from './components/Toast'
import { api } from './lib/api'

export default function App() {
  const [page, setPage] = useState('composer')
  const [toasts, setToasts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inboxCount, setInboxCount] = useState(0)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sp-theme') : null
    const isDark = saved === 'dark'
    setDarkMode(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('sp-theme', next ? 'dark' : 'light')
  }
  const [metaSession, setMetaSession] = useState(null)

  useEffect(() => {
    loadAccounts()
    loadCurrentUser()
    handleOAuthRedirect()
    loadInboxCount()
  }, [])

  async function loadAccounts() {
    const data = await api.listAccounts()
    setAccounts(data || [])
  }

  async function loadInboxCount() {
    try {
      const r = await fetch('/api/inbox/count')
      if (r.ok) { const d = await r.json(); setInboxCount(d.pending || 0) }
    } catch {}
  }

  async function loadCurrentUser() {
    try {
      const r = await fetch('/api/auth/me')
      if (r.ok) {
        setCurrentUser(await r.json())
      } else if (r.status === 401) {
        window.location.href = '/login'
      } else if (r.status === 403) {
        window.location.href = '/login?error=compte-desactive'
      } else {
        const err = await r.json().catch(() => ({}))
        console.error('[loadCurrentUser]', r.status, err)
      }
    } catch (e) {
      console.error('[loadCurrentUser]', e)
    }
  }

  async function handleOAuthRedirect() {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const oauth = url.searchParams.get('oauth')
    if (!oauth) return

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
      <div className="hidden md:flex">
        <Sidebar currentPage={page} setPage={setPage} accounts={accounts} currentUser={currentUser} inboxCount={inboxCount} darkMode={darkMode} onToggleDark={toggleDarkMode} />
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentPage={page}
        setPage={setPage}
        accounts={accounts}
        currentUser={currentUser}
        inboxCount={inboxCount}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-ivory-50">
        <MobileHeader
          accounts={accounts}
          currentPage={page}
          onOpenMenu={() => setDrawerOpen(true)}
        />

        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {page === 'composer'     && <Composer {...pageProps} />}
          {page === 'stories'      && <Stories {...pageProps} />}
          {page === 'accounts'     && <Accounts {...pageProps} />}
          {page === 'queue'        && <Calendar {...pageProps} />}
          {page === 'history'      && <History {...pageProps} />}
          {page === 'analytics'    && <Analytics {...pageProps} />}
          {page === 'replies'      && <Replies {...pageProps} />}
          {page === 'inbox'        && <Inbox {...pageProps} />}
          {page === 'invitations'  && <Invitations addToast={addToast} />}
          {page === 'admin-users'  && <AdminUsers addToast={addToast} />}
          {page === 'admin-stats'  && <AdminStats addToast={addToast} />}
          {page === 'admin-audit'  && <AdminAudit addToast={addToast} />}
          {page === 'settings'     && <UserSettings currentUser={currentUser} addToast={addToast} />}
        </div>
      </main>

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
