'use client'
import { useEffect } from 'react'
import { PenSquare, Clock, History, Users, X, Leaf, LogOut, MessageSquareReply } from 'lucide-react'

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

const PLATFORM_COLORS = {
  instagram: 'bg-gradient-to-br from-purple-400 to-pink-400',
  facebook: 'bg-blue-500',
  linkedin: 'bg-blue-600',
  tiktok: 'bg-warm-700',
  threads: 'bg-warm-800',
}

const PLATFORM_ICONS = {
  instagram: '📸', facebook: '📘', linkedin: '💼', tiktok: '🎵', threads: '🧵',
}

const NAV = [
  { id: 'composer', label: 'Composer', icon: PenSquare },
  { id: 'replies', label: 'Réponses', icon: MessageSquareReply },
  { id: 'queue', label: 'Calendrier', icon: Clock },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'accounts', label: 'Comptes', icon: Users },
]

export default function MobileDrawer({ open, onClose, currentPage, setPage, accounts }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function go(pageId) {
    setPage(pageId)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`md:hidden fixed inset-0 bg-warm-800/40 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-cream border-r border-warm-200 flex flex-col transition-transform duration-200 ease-out shadow-2xl ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5 border-b border-warm-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-sm">
              <Leaf size={18} className="text-white" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <h1 className="text-warm-700 font-semibold text-[15px]">Social Poster</h1>
              <p className="text-warm-500 text-xs">Aux graines du bien-être</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-warm-500 hover:bg-warm-100 active:bg-warm-200 transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id
            return (
              <button
                key={id}
                onClick={() => go(id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-medium transition-all ${
                  active
                    ? 'bg-sage-100 text-sage-800 border border-sage-200'
                    : 'text-warm-600 hover:bg-warm-100 active:bg-warm-200 border border-transparent'
                }`}
              >
                <Icon size={19} strokeWidth={1.8} />
                {label}
              </button>
            )
          })}

          {/* Connected accounts (full list) */}
          <div className="pt-5 mt-2 border-t border-warm-200">
            <p className="text-[10px] text-warm-400 uppercase tracking-wider mb-3 font-semibold px-3.5">Comptes connectés</p>
            {accounts.length === 0 ? (
              <p className="text-xs text-warm-400 italic px-3.5">Aucun compte connecté</p>
            ) : (
              <div className="space-y-1">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${PLATFORM_COLORS[account.platform] || 'bg-warm-300'} flex-shrink-0 overflow-hidden`}>
                      {account.avatar
                        ? <img src={account.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                        : PLATFORM_ICONS[account.platform] || '?'
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-warm-700 truncate font-medium">{account.name}</p>
                      <p className="text-[11px] text-warm-400 capitalize">{account.platform}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-3 border-t border-warm-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-medium text-warm-500 hover:bg-warm-100 active:bg-warm-200 transition-colors"
          >
            <LogOut size={18} strokeWidth={1.8} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
