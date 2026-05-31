'use client'
import { useEffect } from 'react'
import { X, Clock, CheckCircle2, AlertCircle, XCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PLATFORM_INFO = {
  facebook:  { emoji: '📘', label: 'Facebook',  color: 'bg-blue-500' },
  instagram: { emoji: '📸', label: 'Instagram', color: 'bg-gradient-to-br from-purple-400 to-pink-400' },
  linkedin:  { emoji: '💼', label: 'LinkedIn',  color: 'bg-blue-600' },
  threads:   { emoji: '🧵', label: 'Threads',   color: 'bg-warm-800' },
  tiktok:    { emoji: '🎵', label: 'TikTok',    color: 'bg-warm-700' },
}

const STATUS_CONFIG = {
  scheduled: { label: 'Planifié',     icon: Clock,         color: 'text-sage-700 bg-sage-100 border-sage-300' },
  publishing:{ label: 'En cours…',    icon: Clock,         color: 'text-gold-600 bg-gold-300/30 border-gold-400' },
  published: { label: 'Publié',       icon: CheckCircle2,  color: 'text-sage-700 bg-sage-100 border-sage-300' },
  partial:   { label: 'Partiellement publié', icon: AlertCircle, color: 'text-gold-600 bg-gold-300/30 border-gold-400' },
  failed:    { label: 'Échec',        icon: XCircle,       color: 'text-[#B07060] bg-[#FBEEEA] border-[#E5C8BD]' },
  cancelled: { label: 'Annulé',       icon: XCircle,       color: 'text-warm-500 bg-warm-100 border-warm-200' },
}

export default function PostDetailModal({ post, onClose, onCancel }) {
  // Close on Escape
  useEffect(() => {
    if (!post) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [post, onClose])

  if (!post) return null

  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.scheduled
  const StatusIcon = status.icon
  const ts = post.scheduled_at || post.created_at
  const isFuture = post.scheduled_at && post.scheduled_at * 1000 > Date.now()
  const canCancel = post.status === 'scheduled' && isFuture

  // Map results by platform for per-platform status
  const resultsByPlatform = {}
  for (const r of (post.results || [])) {
    resultsByPlatform[r.platform] = r
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-warm-800/50 backdrop-blur-sm transition-opacity"
      />
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 p-0 md:p-4">
        <div className="bg-cream md:rounded-2xl rounded-t-3xl shadow-2xl border border-warm-200 w-full md:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200">
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${status.color}`}>
                <StatusIcon size={12} />
                {status.label}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-warm-500 hover:bg-warm-100 active:bg-warm-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Date */}
            {ts && (
              <div>
                <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-1">
                  {post.scheduled_at && isFuture ? 'Planifié pour le' : post.status === 'published' ? 'Publié le' : 'Créé le'}
                </p>
                <p className="text-sm text-warm-700 font-medium">
                  {format(new Date(ts * 1000), 'EEEE d MMMM yyyy \'à\' HH:mm', { locale: fr })}
                </p>
              </div>
            )}

            {/* Content */}
            <div>
              <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-1">Contenu</p>
              <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-sm text-warm-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {post.content || <span className="italic text-warm-400">Pas de texte</span>}
              </div>
            </div>

            {/* Media */}
            {post.media_paths?.length > 0 && (
              <div>
                <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-1">Médias</p>
                <p className="text-sm text-warm-600">📎 {post.media_paths.length} fichier{post.media_paths.length > 1 ? 's' : ''}</p>
              </div>
            )}

            {/* Platforms with per-platform status */}
            <div>
              <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-2">Plateformes</p>
              <div className="space-y-2">
                {post.platforms.map(p => {
                  const info = PLATFORM_INFO[p] || { emoji: '🌐', label: p, color: 'bg-warm-300' }
                  const result = resultsByPlatform[p]
                  return (
                    <div key={p} className="flex items-center gap-3 bg-warm-50 border border-warm-200 rounded-lg px-3 py-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${info.color} flex-shrink-0`}>
                        {info.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-warm-700 font-medium">{info.label}</p>
                        {result && (
                          <p className="text-[11px] text-warm-500 truncate">
                            {result.status === 'published' ? (
                              <span className="text-sage-700">✓ Publié</span>
                            ) : result.status === 'failed' ? (
                              <span className="text-[#B07060]">✗ {result.error_message || result.error || 'Échec'}</span>
                            ) : (
                              result.status
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          {canCancel && (
            <div className="border-t border-warm-200 px-5 py-3 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-warm-200 hover:bg-warm-50 text-warm-600 text-sm font-medium rounded-xl transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => { onCancel(post.id); onClose() }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-[#B07060] bg-[#FBEEEA] hover:bg-[#F5DCD2] active:bg-[#EDC5B5] transition-all border border-[#E5C8BD]"
              >
                <XCircle size={16} />
                Annuler le post
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
