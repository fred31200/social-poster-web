'use client'
import { useState, useEffect } from 'react'
import { Clock, X, RefreshCw, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PlatformBadge from '../components/PlatformBadge'

export default function Queue({ addToast }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await window.api.listScheduled()
      setPosts(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id) {
    if (!confirm('Annuler ce post planifié ?')) return
    await window.api.cancelPost(id)
    addToast('Post annulé', 'success')
    load()
  }

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1">Posts planifiés</h2>
            <p className="text-sm text-warm-500">{posts.length} post{posts.length !== 1 ? 's' : ''} en attente</p>
          </div>
          <button onClick={load} className="text-warm-500 hover:text-warm-600 transition-colors p-2">
            <RefreshCw size={16} />
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar size={40} className="text-warm-300 mb-4" />
            <p className="text-warm-500 text-sm">Aucun post planifié</p>
            <p className="text-warm-400 text-xs mt-1">Compose un post et active la planification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="bg-cream border border-warm-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm text-warm-700 leading-relaxed line-clamp-3 flex-1">
                    {post.content || <span className="italic text-warm-400">Pas de texte</span>}
                  </p>
                  <button
                    onClick={() => handleCancel(post.id)}
                    className="text-warm-400 hover:text-[#B07060] transition-colors flex-shrink-0 p-1"
                    title="Annuler"
                  >
                    <X size={15} />
                  </button>
                </div>

                {post.media_paths?.length > 0 && (
                  <p className="text-xs text-warm-500 mb-2">
                    📎 {post.media_paths.length} média{post.media_paths.length > 1 ? 's' : ''}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {post.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                  </div>
                  {post.scheduled_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gold-600">
                      <Clock size={12} />
                      {format(new Date(post.scheduled_at * 1000), 'dd MMM à HH:mm', { locale: fr })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
