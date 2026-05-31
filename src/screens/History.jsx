'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, History as HistoryIcon, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PlatformBadge from '../components/PlatformBadge'

const STATUS_CONFIG = {
  published: { icon: CheckCircle, color: 'text-sage-600', bg: 'bg-sage-100 border-emerald-500/20', label: 'Publié' },
  failed: { icon: XCircle, color: 'text-[#B07060]', bg: 'bg-[#FBEEEA] border-red-500/20', label: 'Échoué' },
  partial: { icon: AlertTriangle, color: 'text-gold-600', bg: 'bg-gold-300/30 border-gold-300', label: 'Partiel' },
  publishing: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'En cours' },
  cancelled: { icon: XCircle, color: 'text-warm-500', bg: 'bg-gray-500/10 border-gray-500/20', label: 'Annulé' },
}

export default function History({ addToast }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await window.api.listPosts()
      setPosts(data || [])
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-warm-500" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1">Historique</h2>
            <p className="text-sm text-warm-500">{posts.length} publication{posts.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={load} className="text-warm-500 hover:text-warm-600 transition-colors p-2">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 bg-warm-50 p-1 rounded-xl w-fit">
          {['all', 'published', 'failed', 'partial', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? 'bg-white/15 text-warm-700' : 'text-warm-500 hover:text-warm-600'
              }`}
            >
              {f === 'all' ? 'Tous' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <HistoryIcon size={40} className="text-warm-300 mb-4" />
            <p className="text-warm-500 text-sm">Aucune publication trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(post => {
              const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.failed
              const Icon = cfg.icon
              const results = post.results || []

              return (
                <div key={post.id} className={`border rounded-xl p-4 ${cfg.bg}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <Icon size={15} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-warm-700 leading-relaxed line-clamp-2">
                        {post.content || <span className="italic text-warm-500">Pas de texte</span>}
                      </p>
                      <p className="text-xs text-warm-400 mt-1">
                        {format(new Date(post.created_at * 1000), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        {post.media_paths?.length > 0 && ` · 📎 ${post.media_paths.length} média${post.media_paths.length > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${cfg.color} flex-shrink-0`}>{cfg.label}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {post.platforms.map(platform => {
                      const result = results.find(r => r.platform === platform)
                      return (
                        <PlatformBadge key={platform} platform={platform} status={result?.status} />
                      )
                    })}
                  </div>

                  {/* Show errors */}
                  {results.filter(r => r.status === 'failed' && r.error_message).map(r => (
                    <div key={r.platform} className="mt-2 text-xs text-[#B07060]/80 bg-[#FBEEEA] rounded-lg px-3 py-2">
                      <span className="capitalize font-medium">{r.platform}</span> : {r.error_message}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
