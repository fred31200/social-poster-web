'use client'
import { PenSquare, Clock, History, Users } from 'lucide-react'

const NAV = [
  { id: 'composer', label: 'Composer', icon: PenSquare },
  { id: 'queue', label: 'Planifiés', icon: Clock },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'accounts', label: 'Comptes', icon: Users },
]

export default function BottomNav({ currentPage, setPage }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-cream/95 backdrop-blur-md border-t border-warm-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? 'text-sage-700' : 'text-warm-400 active:text-warm-600'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
              <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
