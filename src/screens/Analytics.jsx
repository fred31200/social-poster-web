'use client'
import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, RefreshCw, TrendingUp, Loader2, BarChart2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PLATFORM_EMOJI = { facebook: '📘', instagram: '📸', linkedin: '💼', threads: '🧵', tiktok: '🎵', google: '📍' }
const MAX_POSTS = 8 // derniers posts analysés (1 appel Graph API par post)

export default function Analytics({ addToast }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  async function load() {
    setLoading(true)
    try {
      const posts = (await window.api.listPosts()) || []
      const published = posts
        .filter(p => p.status === 'published' || p.status === 'partial')
        .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
        .slice(0, MAX_POSTS)

      const statsList = await Promise.all(
        published.map(p =>
          fetch(`/api/posts/${p.id}/stats`).then(r => r.json()).catch(() => ({ stats: [] }))
        )
      )

      setRows(published.map((p, i) => {
        const stats = statsList[i]?.stats || []
        const likes = stats.reduce((n, s) => n + (s.likes || 0), 0)
        const comments = stats.reduce((n, s) => n + (s.comments || 0), 0)
        const shares = stats.reduce((n, s) => n + (s.shares || 0), 0)
        return { post: p, likes, comments, shares, engagement: likes + comments + shares }
      }))
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totals = rows.reduce(
    (t, r) => ({ likes: t.likes + r.likes, comments: t.comments + r.comments, shares: t.shares + r.shares }),
    { likes: 0, comments: 0, shares: 0 }
  )
  const top = [...rows].sort((a, b) => b.engagement - a.engagement).slice(0, 3)
  const maxEng = Math.max(1, ...rows.map(r => r.engagement))
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1 flex items-center gap-2">
              <TrendingUp size={20} className="text-sage-600" /> Performances
            </h2>
            <p className="text-sm text-warm-500">Ce qui fonctionne, en un coup d'œil 🌿</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-sage-700 bg-sage-100 hover:bg-sage-200 border border-sage-300 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={30} className="animate-spin text-sage-600" />
            <p className="text-sm text-warm-500">Je récupère tes chiffres sur les réseaux…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-cream border border-warm-200 rounded-2xl">
            <BarChart2 size={28} className="mx-auto text-warm-300 mb-3" />
            <p className="text-sm text-warm-500">Aucun post publié à analyser pour l'instant.</p>
            <p className="text-xs text-warm-400 mt-1">Publie quelques posts et reviens ici 🌱</p>
          </div>
        ) : (
          <>
            {/* Totaux (sur les derniers posts) */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Heart, label: "J'aime", value: totals.likes, grad: 'from-rose-50 to-rose-100', col: 'text-rose-500', border: 'border-rose-200' },
                { icon: MessageCircle, label: 'Commentaires', value: totals.comments, grad: 'from-sky-50 to-sky-100', col: 'text-sky-500', border: 'border-sky-200' },
                { icon: Share2, label: 'Partages', value: totals.shares, grad: 'from-sage-100 to-sage-200', col: 'text-sage-600', border: 'border-sage-300' },
              ].map(({ icon: Icon, label, value, grad, col, border }) => (
                <div key={label} className={`bg-gradient-to-br ${grad} border ${border} rounded-2xl p-4 text-center`}>
                  <Icon size={18} className={`mx-auto mb-1.5 ${col}`} />
                  <p className="text-2xl font-bold text-warm-700 leading-none">{value}</p>
                  <p className="text-[11px] text-warm-500 mt-1.5">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-warm-400 -mt-3 text-center">Sur tes {rows.length} derniers posts publiés</p>

            {/* Meilleurs posts */}
            <div className="bg-cream border border-warm-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-warm-700 mb-3">🏆 Tes meilleurs posts</h3>
              <div className="space-y-3">
                {top.map((r, i) => (
                  <div key={r.post.id} className="flex items-start gap-3 p-3 rounded-xl bg-warm-50 border border-warm-200">
                    <span className="text-lg leading-none mt-0.5">{medals[i]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-warm-700 line-clamp-2 leading-relaxed">
                        {r.post.content || <span className="italic text-warm-400">Pas de texte</span>}
                      </p>
                      <p className="text-[11px] text-warm-400 mt-1">
                        {format(new Date(r.post.created_at * 1000), 'dd MMM', { locale: fr })}
                        {' · '}{(r.post.platforms || []).map(p => PLATFORM_EMOJI[p] || p).join(' ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-[11px] text-warm-500 flex-shrink-0">
                      <span className="font-bold text-sage-700 text-sm">{r.engagement}</span>
                      <span>interactions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post par post (barres) */}
            <div className="bg-cream border border-warm-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-warm-700 mb-4">📊 Post par post</h3>
              <div className="space-y-3.5">
                {rows.map(r => (
                  <div key={r.post.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-warm-600 truncate flex-1 mr-3">
                        {(r.post.content || 'Pas de texte').slice(0, 60)}{(r.post.content || '').length > 60 ? '…' : ''}
                      </p>
                      <span className="text-[11px] text-warm-400 flex items-center gap-2 flex-shrink-0">
                        <span className="flex items-center gap-0.5"><Heart size={10} className="text-rose-400" />{r.likes}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle size={10} className="text-sky-400" />{r.comments}</span>
                        <span className="flex items-center gap-0.5"><Share2 size={10} className="text-sage-500" />{r.shares}</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sage-400 to-sage-600 transition-all"
                        style={{ width: `${Math.max(3, Math.round((r.engagement / maxEng) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-warm-400 mt-4">
                Interactions = j'aime + commentaires + partages (Facebook & Instagram ; les autres réseaux ne fournissent pas encore ces chiffres).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
