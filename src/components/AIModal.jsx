'use client'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Loader2, RefreshCw, Check, Wand2, Scissors, MoveRight, Hash, Smile, Maximize2 } from 'lucide-react'

const QUICK_TOPICS = [
  'Les bienfaits du massage abhyanga pour le stress',
  'Comprendre son dosha (vata, pitta, kapha)',
  'Comment préparer son corps à l\'hiver en ayurvéda',
  'L\'importance du shirodhara pour le sommeil',
  '5 conseils pour intégrer l\'ayurvéda dans son quotidien',
]

const REFINE_ACTIONS = [
  { id: 'shorter',     label: 'Plus court',  icon: Scissors },
  { id: 'longer',      label: 'Plus long',   icon: Maximize2 },
  { id: 'more-pro',    label: 'Plus pro',    icon: Wand2 },
  { id: 'with-emojis', label: '+ Emojis',    icon: Smile },
  { id: 'hashtags',    label: 'Hashtags',    icon: Hash },
]

export default function AIModal({ open, onClose, onInsert, platform = null, currentText = '' }) {
  const [topic, setTopic] = useState('')
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('generate') // 'generate' | 'variations' | refine mode
  const abortRef = useRef(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTopic('')
      setGenerated('')
      setError('')
      setMode('generate')
    } else if (abortRef.current) {
      abortRef.current.abort()
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, loading, onClose])

  async function runGeneration({ mode: m, customCurrentText }) {
    setError('')
    setGenerated('')
    setLoading(true)
    setMode(m)
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const body = {
        mode: m,
        topic: topic.trim(),
        platform,
        currentText: customCurrentText ?? generated.trim() ?? currentText.trim(),
      }
      const r = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })

      if (!r.ok) {
        const errData = await r.json().catch(() => ({}))
        setError(errData.error || `Erreur ${r.status}`)
        setLoading(false)
        return
      }

      // Parse SSE stream
      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages (split on \n\n)
        const events = buffer.split('\n\n')
        buffer = events.pop() || '' // keep incomplete event in buffer

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

  function handleInsertAndClose() {
    onInsert(generated)
    onClose()
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={loading ? undefined : onClose}
        className={`fixed inset-0 z-50 bg-warm-800/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Modal */}
      <div
        className={`fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 p-0 md:p-4 transition-all duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className={`bg-cream md:rounded-2xl rounded-t-3xl shadow-2xl border border-warm-200 w-full md:max-w-xl max-h-[90vh] flex flex-col overflow-hidden transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        }`}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center shadow-sm">
                <Sparkles size={18} className="text-white" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-warm-700 font-semibold text-[15px] leading-tight">Générateur IA</h2>
                <p className="text-warm-500 text-[11px]">Claude · ton style massage ayurvédique</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-9 h-9 rounded-full flex items-center justify-center text-warm-500 hover:bg-warm-100 active:bg-warm-200 disabled:opacity-40 transition-colors"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Topic input */}
            {!generated && !loading && (
              <>
                <div>
                  <label className="block text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2">
                    Sur quoi veux-tu écrire ?
                  </label>
                  <textarea
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="ex: Les bienfaits du massage abhyanga sur le stress..."
                    rows={3}
                    className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-[15px] text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors resize-none"
                  />
                  {platform && (
                    <p className="text-[11px] text-warm-500 mt-1.5">
                      💡 Adapté pour <strong className="text-sage-700 capitalize">{platform}</strong>
                    </p>
                  )}
                </div>

                {/* Quick topics */}
                <div>
                  <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-2">Idées rapides</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TOPICS.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => setTopic(t)}
                        className="text-xs text-warm-600 bg-warm-50 hover:bg-warm-100 active:bg-warm-200 border border-warm-200 hover:border-warm-300 rounded-lg px-2.5 py-1.5 transition-colors text-left max-w-full"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => runGeneration({ mode: 'generate' })}
                    disabled={!topic.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20"
                  >
                    <Sparkles size={16} />
                    Générer 1 post
                  </button>
                  <button
                    onClick={() => runGeneration({ mode: 'variations' })}
                    disabled={!topic.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-sage-700 bg-sage-100 hover:bg-sage-200 active:bg-sage-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-sage-300"
                  >
                    <RefreshCw size={16} />
                    3 versions
                  </button>
                </div>
              </>
            )}

            {/* Loading */}
            {loading && !generated && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={32} className="text-sage-600 animate-spin" />
                <p className="text-sm text-warm-500">Claude rédige…</p>
              </div>
            )}

            {/* Generated output */}
            {generated && (
              <div>
                <label className="block text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                  Résultat
                  {loading && <Loader2 size={11} className="animate-spin text-sage-600" />}
                </label>
                <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-[15px] text-warm-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {generated}
                  {loading && <span className="inline-block w-1.5 h-4 bg-sage-500 align-middle ml-0.5 animate-pulse" />}
                </div>

                {/* Refine actions (only when generation finished) */}
                {!loading && (
                  <div className="mt-3">
                    <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-1.5">Affiner</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REFINE_ACTIONS.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => runGeneration({ mode: id })}
                          className="flex items-center gap-1.5 text-xs text-warm-600 bg-cream hover:bg-warm-50 active:bg-warm-100 border border-warm-200 hover:border-warm-300 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => runGeneration({ mode: mode === 'variations' ? 'variations' : 'generate' })}
                        className="flex items-center gap-1.5 text-xs text-sage-700 bg-sage-100 hover:bg-sage-200 active:bg-sage-300 border border-sage-300 rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        <RefreshCw size={12} />
                        Régénérer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-[#FBEEEA] border border-[#E5C8BD] text-[#B07060] text-xs rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}
          </div>

          {/* Footer with Insert button */}
          {generated && !loading && (
            <div className="border-t border-warm-200 px-5 py-3 flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-warm-200 hover:bg-warm-50 active:bg-warm-100 text-warm-600 text-sm font-medium rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleInsertAndClose}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 transition-all shadow-sm shadow-sage-500/20"
              >
                <Check size={16} />
                Utiliser ce post
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
