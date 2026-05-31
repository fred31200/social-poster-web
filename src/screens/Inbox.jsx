'use client'
import { useState, useEffect } from 'react'
import { Inbox as InboxIcon, RefreshCw, Send, X, ExternalLink, Loader2, Check, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PLATFORM_EMOJI = {
  facebook: '📘',
  instagram: '📸',
  linkedin: '💼',
  threads: '🧵',
}

export default function Inbox({ addToast }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [filter, setFilter] = useState('pending') // 'pending' | 'replied' | 'all'
  const [lastPolledAt, setLastPolledAt] = useState(0)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try {
      const status = filter === 'all' ? '' : filter
      const r = await fetch(`/api/inbox?status=${status}`)
      const data = await r.json()
      setComments(data.comments || [])
      setLastPolledAt(data.last_polled_at || 0)
    } catch (err) {
      addToast('Erreur chargement: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function pollNow() {
    setPolling(true)
    try {
      const r = await fetch('/api/inbox/poll', { method: 'POST' })
      const data = await r.json()
      if (data.error) {
        addToast(data.error, 'error')
      } else {
        const msg = data.new_comments > 0
          ? `${data.new_comments} nouveau${data.new_comments > 1 ? 'x' : ''} commentaire${data.new_comments > 1 ? 's' : ''}`
          : 'Aucun nouveau commentaire'
        addToast(msg, 'success')
        await load()
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setPolling(false)
    }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-warm-700 mb-1 flex items-center gap-2">
              <InboxIcon size={22} className="text-sage-600" />
              Inbox
            </h2>
            <p className="text-sm text-warm-500">
              Commentaires de tes Pages — réponse en 1 clic
              {lastPolledAt > 0 && (
                <span className="block text-[11px] text-warm-400 mt-0.5">
                  Dernière mise à jour : {formatDistanceToNow(new Date(lastPolledAt * 1000), { addSuffix: true, locale: fr })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={pollNow}
            disabled={polling}
            className="flex items-center gap-1.5 text-sm font-medium text-sage-700 bg-sage-100 hover:bg-sage-200 active:bg-sage-300 disabled:opacity-50 border border-sage-300 px-3 py-2 rounded-lg transition-colors"
          >
            {polling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden md:inline">Actualiser</span>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-5 bg-warm-100 rounded-lg p-0.5">
          {[
            { id: 'pending', label: 'À traiter' },
            { id: 'replied', label: 'Répondus' },
            { id: 'all',     label: 'Tous' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === id ? 'bg-cream text-sage-700 shadow-sm' : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-warm-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <InboxIcon size={40} className="text-warm-300 mb-4" />
            <p className="text-warm-500 text-sm">
              {filter === 'pending' ? 'Aucun commentaire en attente' : 'Aucun commentaire'}
            </p>
            <p className="text-warm-400 text-xs mt-1">
              {filter === 'pending'
                ? 'Clique « Actualiser » pour vérifier maintenant'
                : 'Quand tu recevras des commentaires, ils apparaîtront ici'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(c => (
              <CommentCard key={c.id} comment={c} onAction={load} addToast={addToast} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentCard({ comment, onAction, addToast }) {
  const [sendingIdx, setSendingIdx] = useState(null)
  const [dismissing, setDismissing] = useState(false)
  const [customReply, setCustomReply] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const isReplied = comment.status === 'replied'
  const isDismissed = comment.status === 'dismissed'
  const isPending = comment.status === 'pending'
  const replies = comment.ai_replies || []

  async function sendReply(text, idx) {
    setSendingIdx(idx)
    try {
      const r = await fetch(`/api/inbox/${comment.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await r.json()
      if (data.error) {
        addToast(data.error, 'error')
      } else {
        addToast('Réponse publiée 🌿', 'success')
        onAction()
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSendingIdx(null)
    }
  }

  async function dismiss() {
    setDismissing(true)
    try {
      const r = await fetch(`/api/inbox/${comment.id}/dismiss`, { method: 'POST' })
      const data = await r.json()
      if (data.error) {
        addToast(data.error, 'error')
      } else {
        addToast('Commentaire ignoré', 'success')
        onAction()
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className={`bg-cream border rounded-2xl overflow-hidden ${
      isReplied ? 'border-sage-300 bg-sage-100/30' :
      isDismissed ? 'border-warm-200 opacity-60' :
      'border-warm-200 shadow-sm'
    }`}>
      {/* Header: author + post context */}
      <div className="px-4 py-3 border-b border-warm-200 bg-warm-50/50">
        <div className="flex items-center gap-2.5 mb-1.5">
          {comment.author_picture ? (
            <img src={comment.author_picture} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-warm-300 flex items-center justify-center text-warm-700 text-xs font-bold">
              {(comment.author_name || '?')[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warm-700 truncate">{comment.author_name || 'Anonyme'}</p>
            <p className="text-[11px] text-warm-500 flex items-center gap-1.5">
              {PLATFORM_EMOJI[comment.platform]} · {comment.fb_created_at ? formatDistanceToNow(new Date(comment.fb_created_at * 1000), { addSuffix: true, locale: fr }) : ''}
            </p>
          </div>
          {comment.post_url && (
            <a
              href={comment.post_url}
              target="_blank"
              rel="noreferrer"
              className="text-warm-400 hover:text-sage-600 transition-colors p-1"
              title="Voir le post"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        {comment.post_message && (
          <p className="text-[11px] text-warm-500 italic line-clamp-1 pl-10">
            sur : {comment.post_message}
          </p>
        )}
      </div>

      {/* Comment body */}
      <div className="px-4 py-3">
        <p className="text-[15px] text-warm-700 whitespace-pre-wrap leading-relaxed">
          {comment.message || <span className="italic text-warm-400">(pas de texte)</span>}
        </p>
      </div>

      {/* Status banner if replied/dismissed */}
      {isReplied && comment.sent_reply_text && (
        <div className="mx-4 mb-3 bg-sage-100 border border-sage-300 rounded-lg p-3">
          <p className="text-[10px] text-sage-700 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
            <CheckCircle2 size={11} /> Ta réponse
          </p>
          <p className="text-sm text-warm-700 whitespace-pre-wrap">{comment.sent_reply_text}</p>
          {comment.sent_at && (
            <p className="text-[10px] text-warm-500 mt-1.5">
              Publiée {formatDistanceToNow(new Date(comment.sent_at * 1000), { addSuffix: true, locale: fr })}
            </p>
          )}
        </div>
      )}

      {isDismissed && (
        <div className="mx-4 mb-3 text-xs text-warm-500 italic">
          Ignoré le {comment.dismissed_at ? format(new Date(comment.dismissed_at * 1000), 'dd MMM HH:mm', { locale: fr }) : '?'}
        </div>
      )}

      {/* AI Suggestions (only for pending) */}
      {isPending && (
        <div className="border-t border-warm-200 bg-cream">
          {replies.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <Loader2 size={16} className="animate-spin text-sage-600 mx-auto mb-1.5" />
              <p className="text-[11px] text-warm-500">L'IA prépare 3 réponses…</p>
            </div>
          ) : (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] text-warm-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                <Sparkles size={10} /> Suggestions
              </p>
              <div className="px-3 pb-3 space-y-2">
                {replies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => sendReply(reply, i)}
                    disabled={sendingIdx !== null || dismissing}
                    className="w-full text-left p-3 rounded-lg bg-warm-50 hover:bg-sage-100 active:bg-sage-200 border border-warm-200 hover:border-sage-400 transition-colors disabled:opacity-40 group"
                  >
                    <p className="text-sm text-warm-700 whitespace-pre-wrap leading-relaxed mb-2">{reply}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-sage-700 font-semibold">Version {i + 1}</span>
                      {sendingIdx === i ? (
                        <Loader2 size={12} className="animate-spin text-sage-700" />
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-sage-700 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          <Send size={11} /> Publier
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {/* Custom reply toggle */}
                {!showCustom ? (
                  <button
                    onClick={() => setShowCustom(true)}
                    className="w-full text-left p-2 rounded-lg text-xs text-warm-500 hover:bg-warm-50 transition-colors"
                  >
                    ✏️ Écrire une réponse personnalisée…
                  </button>
                ) : (
                  <div className="bg-warm-50 border border-warm-200 rounded-lg p-2">
                    <textarea
                      value={customReply}
                      onChange={e => setCustomReply(e.target.value)}
                      placeholder="Ta réponse…"
                      rows={3}
                      className="w-full bg-cream border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 outline-none focus:border-sage-500 resize-none mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowCustom(false); setCustomReply('') }}
                        className="px-3 py-1.5 text-xs text-warm-500 hover:text-warm-700"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => sendReply(customReply, 'custom')}
                        disabled={!customReply.trim() || sendingIdx !== null}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-sage-600 hover:bg-sage-500 disabled:opacity-40 transition-colors"
                      >
                        {sendingIdx === 'custom' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        Publier ma réponse
                      </button>
                    </div>
                  </div>
                )}

                {/* Dismiss */}
                <button
                  onClick={dismiss}
                  disabled={sendingIdx !== null || dismissing}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-warm-500 hover:text-[#B07060] hover:bg-warm-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  {dismissing ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                  Ignorer ce commentaire
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
