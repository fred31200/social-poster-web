'use client'
import { Menu, Leaf } from 'lucide-react'

const PAGE_TITLES = {
  composer: 'Composer',
  queue: 'Planifiés',
  history: 'Historique',
  accounts: 'Comptes',
}

export default function MobileHeader({ accounts, currentPage, onOpenMenu }) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-warm-200">
      <div className="flex items-center justify-between px-3 py-3">
        <button
          onClick={onOpenMenu}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-warm-600 hover:bg-warm-100 active:bg-warm-200 transition-colors"
          aria-label="Menu"
        >
          <Menu size={22} strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center shadow-sm">
            <Leaf size={14} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-warm-700 font-semibold text-[15px]">{PAGE_TITLES[currentPage] || 'Social Poster'}</h1>
        </div>

        {/* Spacer to balance */}
        <div className="w-10 h-10" />
      </div>
    </header>
  )
}
