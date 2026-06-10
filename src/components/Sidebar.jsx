'use client'
import { PenSquare, Users, Clock, History, Leaf, LogOut, MessageSquareReply, Inbox, Shield, Settings, BarChart2, ScrollText, Moon, Sun } from 'lucide-react'

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
  meta: 'bg-gradient-to-br from-blue-500 to-purple-400',
}

const PLATFORM_ICONS = {
  instagram: '📸', facebook: '📘', linkedin: '💼', tiktok: '🎵', threads: '🧵', meta: '🔵',
}

const NAV = [
  { id: 'composer', label: 'Composer', icon: PenSquare },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'replies', label: 'Réponses (paste)', icon: MessageSquareReply },
  { id: 'queue', label: 'Calendrier', icon: Clock },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'analytics', label: 'Statistiques', icon: BarChart2 },
  { id: 'accounts', label: 'Comptes', icon: Users },
]

export default function Sidebar({ currentPage, setPage, accounts, currentUser, inboxCount = 0, darkMode = false, onToggleDark }) {
  return (
    <aside className="w-64 flex flex-col bg-cream border-r border-warm-200 pt-8 pb-4 select-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-sm">
            <Leaf size={18} className="text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-warm-700 font-semibold text-[15px] leading-tight">Social Poster</h1>
            <p className="text-warm-500 text-xs truncate max-w-[130px]">{currentUser?.email || 'Aux graines du bien-être'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id
          const badge = id === 'inbox' && inboxCount > 0
          return (
            <button key={id} onClick={() => setPage(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? 'bg-sage-100 text-sage-800 border border-sage-200' : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
              {badge && <span className="ml-auto bg-[#B07060] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{inboxCount > 99 ? '99+' : inboxCount}</span>}
            </button>
          )
        })}

        {/* Settings for all users */}
        <button onClick={() => setPage('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            currentPage === 'settings' ? 'bg-sage-100 text-sage-800 border border-sage-200' : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
          }`}
        >
          <Settings size={17} strokeWidth={1.8} />
          Réglages
        </button>

        {/* Admin section */}
        {currentUser?.isAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-[10px] text-warm-400 uppercase tracking-wider px-3 font-semibold">Admin</p>
            </div>
            <button onClick={() => setPage('invitations')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentPage === 'invitations' ? 'bg-sage-100 text-sage-800 border border-sage-200' : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
              }`}
            >
              <Shield size={17} strokeWidth={1.8} />
              Invitations
            </button>
            <button onClick={() => setPage('admin-users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentPage === 'admin-users' ? 'bg-sage-100 text-sage-800 border border-sage-200' : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
              }`}
            >
              <Users size={17} strokeWidth={1.8} />
              Utilisateurs
            </button>
            <button onClick={() => setPage('admin-stats')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentPage === 'admin-stats' ? 'bg-sage-100 text-sage-800 border border-sage-200' : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
              }`}
            >
              <BarChart2 size={17} strokeWidth={1.8} />
              Statistiques
            </button>
            <button onClick={() => setPage('admin-audit')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentPage === 'admin-audit' ? 'bg-sage-100 text-sage-800 border border-sage-200' : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
              }`}
            >
              <ScrollText size={17} strokeWidth={1.8} />
              Journal
            </button>
          </>
        )}
      </nav>

      <div className="px-3 pt-3 space-y-1">
        {onToggleDark && (
          <button onClick={onToggleDark}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-warm-500 hover:text-warm-700 hover:bg-warm-100 transition-colors">
            {darkMode ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
            {darkMode ? 'Mode clair' : 'Mode sombre'}
          </button>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-warm-500 hover:text-warm-700 hover:bg-warm-100 transition-colors">
          <LogOut size={16} strokeWidth={1.8} />
          Déconnexion
        </button>
      </div>

      <div className="px-4 pt-4 border-t border-warm-200">
        <p className="text-[10px] text-warm-400 uppercase tracking-wider mb-3 font-semibold">Comptes connectés</p>
        {accounts.length === 0 ? (
          <p className="text-xs text-warm-400 italic">Aucun compte</p>
        ) : (
          <div className="space-y-2">
            {accounts.slice(0, 5).map(account => (
              <div key={account.id} className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${PLATFORM_COLORS[account.platform] || 'bg-warm-300'} flex-shrink-0`}>
                  {account.avatar
                    ? <img src={account.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                    : PLATFORM_ICONS[account.platform] || '?'
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-warm-700 truncate font-medium">{account.name}</p>
                  <p className="text-xs text-warm-400 capitalize">{account.platform}</p>
                </div>
              </div>
            ))}
            {accounts.length > 5 && (
              <p className="text-xs text-warm-400">+{accounts.length - 5} autre{accounts.length - 5 > 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
