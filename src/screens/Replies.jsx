'use client'
import { useState, useRef } from 'react'
import { MessageSquareReply, Sparkles, Loader2, Copy, Check, RefreshCw, ChevronDown } from 'lucide-react'

const PLATFORMS = [
  { id: '',          label: 'Auto (universel)', emoji: '🌐' },
  { id: 'facebook',  label: 'Facebook',         emoji: '📘' },
  { id: 'instagram', label: 'Instagram',        emoji: '📸' },
  { id: 'linkedin',  label: 'LinkedIn',         emoji: '💼' },
  { id: 'threads',   label: 'Threads',          emoji: '🧵' },
]

const EXAMPLE_COMMENTS = [
  {
    label: '💚 Gratitude',
    text: 'Merci pour ce moment hors du temps, je me sens vraiment réalignée et apaisée 🙏 Hâte de revenir !',
  },
  {
    label: '❓ Question pratique',
    text: 'Bonjour, je voudrais savoir comment se déroule une première séance et combien de temps ça dure ? Merci !',
  },
  {
    label: '🔮 Question spirituelle',
    text: 'C\'est quoi exactement le travail sur les chakras ? Je débute dans tout ça et je suis curieuse de comprendre',
  },
  {
    label: '😟 Doute',
    text: 'Je traverse une période vraiment difficile en ce moment… est-ce que ce genre de pratique peut vraiment aider ou c\'est juste de la relaxation ?',
  },
]

export default function Replies({ addToast }) {
  const [comment, setComment] = useState('')
  const [platform, setPlatform] = useState('')
  const [author, setAuthor] = useState('')
  const [context, setContext] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState(null)
  const abortRef = useRef(null)

  // Split generated text by "---" to get individual replies
  const replies = generated
    ? generated.split(/\n---\n|\n---\s*$/).map(s => s.trim()).filter(Boolean)
    : []

  async function generate() {
    if (!comment.trim() || loading) return
    setError('')
    setGenerated('')
    setCopiedIdx(null)
    setLoading(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const r = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: comment.trim(),
          platform: platform || null,
          author: author.trim() || null,
          context: context.trim() || null,
        }),
        signal: ctrl.signal,
      })

      if (!r.ok) {
        const errData = await r.json().catch(() => ({}))
        setError(errData.error || `Erreur ${r.status}`)
        setLoading(false)
        return
      }

      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const evt of events) {
          const line = evt.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.error) { setError(data.error); break }
            if (data.text) {
              acc += data.text
              setGenerated(acc)
            }
            if (data.done) {
              setLoading(false)
              abortRef.current = null
              return
            }
          } catch {}
        }
      }
      setLoading(false)
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
      setLoading(false)
    }
  }

  async function copyReply(text, idx) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      addToast('Réponse copiée — colle-la sur ' + (platform ? PLATFORMS.find(p => p.id === platform)?.label : 'le réseau social') + ' 🌿', 'success')
      setTimeout(() => setCopiedIdx(null), 2500)
    } catch {
      addToast('Impossible de copier — fais-le à la main', 'error')
    }
  }

  return (
    <div className="p-4 md:p-6 md:pt-10 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-warm-700 mb-1 flex items-center gap-2">
            <MessageSquareReply size={22} className="text-sage-600" />
            Réponses IA
          </h2>
          <p className="text-sm text-warm-500">Colle un commentaire reçu, l'IA te propose 3 réponses dans ton style</p>
        </div>

        {/* Comment input */}
        <div className="mb-4">
          <label className="block text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2">
            Commentaire reçu
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Colle ici le commentaire auquel tu veux répondre…"
            rows={4}
            className="w-full bg-cream border border-warm-200 rounded-xl px-4 py-3 text-[15px] text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors resize-none shadow-sm"
          />
        </div>

        {/* Example comments */}
        {!comment && (
          <div className="mb-4">
            <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-2">Exemples pour tester</p>
            <div className="grid grid-cols-2 gap-1.5">
              {EXAMPLE_COMMENTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setComment(ex.text)}
                  className="text-left p-2.5 rounded-lg bg-warm-50 hover:bg-warm-100 border border-warm-200 hover:border-warm-300 transition-colors"
                >
                  <p className="text-xs font-semibold text-warm-700 mb-1">{ex.label}</p>
                  <p className="text-[11px] text-warm-500 line-clamp-2">{ex.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Platform selector */}
        <div className="mb-4">
          <label className="block text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2">
            Plateforme
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {PLATFORMS.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setPlatform(id)}
                title={label}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                  platform === id
                    ? 'border-sage-500 bg-sage-100 text-sage-700'
                    : 'border-warm-200 bg-warm-50 text-warm-500 hover:border-warm-300'
                }`}
              >
                <span className="text-base">{emoji}</span>
                <span className="hidden md:block">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-warm-500 hover:text-warm-700 transition-colors mb-3"
        >
          <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Options avancées
        </button>

        {showAdvanced && (
          <div className="mb-4 space-y-3 bg-warm-50 border border-warm-200 rounded-xl p-3">
            <div>
              <label className="block text-[10px] text-warm-500 uppercase tracking-wider font-semibold mb-1">
                Prénom de la personne (optionnel)
              </label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="ex: Marie"
                className="w-full bg-cream border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-warm-500 uppercase tracking-wider font-semibold mb-1">
                Contexte (optionnel)
              </label>
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="ex: cliente régulière, ou : 1er contact"
                className="w-full bg-cream border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500"
              />
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!comment.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20 mb-4"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Rédige 3 réponses…' : 'Générer 3 réponses'}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-[#FBEEEA] border border-[#E5C8BD] text-[#B07060] text-xs rounded-lg px-3 py-2.5 mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {replies.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-warm-500 uppercase tracking-wider font-semibold flex items-center gap-2">
              Suggestions
              {loading && <Loader2 size={11} className="animate-spin text-sage-600" />}
            </p>
            {replies.map((reply, i) => (
              <div key={i} className="bg-cream border border-warm-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[10px] font-semibold text-sage-700 bg-sage-100 px-2 py-0.5 rounded">
                    Version {i + 1}
                  </span>
                  <button
                    onClick={() => copyReply(reply, i)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                      copiedIdx === i
                        ? 'text-sage-700 bg-sage-100 border border-sage-300'
                        : 'text-warm-600 bg-warm-50 hover:bg-warm-100 border border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                    {copiedIdx === i ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                <p className="text-[15px] text-warm-700 whitespace-pre-wrap leading-relaxed">
                  {reply}
                </p>
              </div>
            ))}

            {!loading && (
              <button
                onClick={generate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-sage-700 bg-sage-100 hover:bg-sage-200 active:bg-sage-300 transition-all border border-sage-300"
              >
                <RefreshCw size={14} />
                Régénérer 3 autres versions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
