'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, X, Loader2, RefreshCw, Check, Wand2, Scissors, Hash, Smile, Maximize2,
  Type, ImageIcon, Square, RectangleVertical, RectangleHorizontal, Leaf, Flower2, Soup, Heart, Plus
} from 'lucide-react'

const QUICK_TOPICS = [
  'Une intention pour la nouvelle lune',
  'Comment s\'ancrer quand le mental s\'emballe',
  'Le rituel du matin pour aligner corps et esprit',
  'Lâcher-prise : ce que ça veut vraiment dire',
  'Se reconnecter à son énergie au changement de saison',
  'Méditation : 3 minutes pour revenir à soi',
]

const REFINE_ACTIONS = [
  { id: 'shorter',     label: 'Plus court',  icon: Scissors },
  { id: 'longer',      label: 'Plus long',   icon: Maximize2 },
  { id: 'more-pro',    label: 'Plus pro',    icon: Wand2 },
  { id: 'with-emojis', label: '+ Emojis',    icon: Smile },
  { id: 'hashtags',    label: 'Hashtags',    icon: Hash },
]

const IMAGE_PRESETS = [
  { id: 'ambiance',  label: 'Ambiance zen',       icon: Leaf,    prompt: 'Espace de méditation paisible avec bougies, encens qui fume doucement, coussins, tons neutres et boisés, lumière dorée du matin' },
  { id: 'cosmique',  label: 'Spirituel / cosmos', icon: Flower2, prompt: 'Illustration spirituelle onirique — phases de la lune, étoiles, mandala doré sur fond bleu nuit profond, aquarelle délicate' },
  { id: 'nature',    label: 'Nature & éléments',  icon: Soup,    prompt: 'Nature apaisante au lever du soleil — forêt brumeuse, eau calme, pierres empilées en équilibre, lumière douce et spirituelle' },
  { id: 'energie',   label: 'Énergie & soin',     icon: Heart,   prompt: 'Mains en geste de soin énergétique, lumière douce entre les paumes, cristaux et plantes, atmosphère sereine et lumineuse' },
]

const IMAGE_RATIOS = [
  { id: '1:1',  label: '1:1',    desc: 'Carré (Instagram)',  icon: Square },
  { id: '4:5',  label: '4:5',    desc: 'Portrait (IG feed)', icon: RectangleVertical },
  { id: '16:9', label: '16:9',   desc: 'Paysage (FB/LI)',    icon: RectangleHorizontal },
  { id: '9:16', label: '9:16',   desc: 'Story / Reel',       icon: RectangleVertical },
]

// ImageResult sub-component — handles per-image loading state since
// Pollinations.ai generates server-side when the browser hits the URL
function ImageResult({ url, idx, onSelect, adding, disabled }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  return (
    <button
      onClick={() => loaded && !error && onSelect(url, idx)}
      disabled={disabled || !loaded || error}
      className="relative aspect-square rounded-xl overflow-hidden border-2 border-warm-200 hover:border-sage-500 active:border-sage-600 transition-all group disabled:opacity-50 bg-warm-100"
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-warm-100">
          <Loader2 size={20} className="text-sage-600 animate-spin" />
          <span className="text-[10px] text-warm-500">Chargement…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FBEEEA] p-2">
          <span className="text-[10px] text-[#B07060] text-center">Échec, retente</span>
        </div>
      )}
      <img
        src={url}
        alt={`Variation ${idx + 1}`}
        className={`w-full h-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {adding ? (
        <div className="absolute inset-0 bg-warm-800/60 flex items-center justify-center">
          <Loader2 size={24} className="text-white animate-spin" />
        </div>
      ) : loaded && !error && (
        <div className="absolute inset-0 bg-sage-600/0 group-hover:bg-sage-600/20 transition-colors flex items-center justify-center">
          <div className="bg-white text-sage-700 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <Plus size={20} />
          </div>
        </div>
      )}
    </button>
  )
}

export default function AIModal({ open, onClose, onInsert, onAddImage, platform = null, currentText = '' }) {
  // ── Tabs ──
  const [tab, setTab] = useState('text') // 'text' | 'image'

  // ── Text state ──
  const [topic, setTopic] = useState('')
  const [generated, setGenerated] = useState('')
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState('')
  const [mode, setMode] = useState('generate')
  const textAbortRef = useRef(null)

  // ── Image state ──
  const [imgPrompt, setImgPrompt] = useState('')
  const [imgRatio, setImgRatio] = useState('1:1')
  const [imgResults, setImgResults] = useState([]) // array of URLs
  const [imgLoading, setImgLoading] = useState(false)
  const [imgError, setImgError] = useState('')
  const [addingImageIdx, setAddingImageIdx] = useState(null)
  // Sous-mode de l'onglet Image : 'search' (photos stock) | 'edit' (img2img Gemini)
  const [imgSource, setImgSource] = useState('search')
  const [refImage, setRefImage] = useState(null) // { base64, mimeType, preview }
  const refFileRef = useRef(null)

  // Reset when opening
  useEffect(() => {
    if (open) {
      setTopic('')
      setGenerated('')
      setTextError('')
      setMode('generate')
      setImgPrompt('')
      setImgResults([])
      setImgError('')
      setAddingImageIdx(null)
      setImgSource('search')
      setRefImage(null)
    } else if (textAbortRef.current) {
      textAbortRef.current.abort()
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !textLoading && !imgLoading) onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, textLoading, imgLoading, onClose])

  // ── Text generation ──
  async function runTextGeneration({ mode: m, customCurrentText }) {
    setTextError('')
    // Mode "hashtags" : on AJOUTE les hashtags sous le post existant au lieu de
    // le remplacer (sinon on perdait le post généré).
    const isHashtags = m === 'hashtags'
    const baseText = (generated.trim() || currentText.trim())
    if (!isHashtags) setGenerated('')
    setTextLoading(true)
    setMode(m)
    const ctrl = new AbortController()
    textAbortRef.current = ctrl

    try {
      const body = {
        mode: m,
        topic: topic.trim(),
        platform,
        currentText: customCurrentText ?? baseText,
      }
      const r = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })

      if (!r.ok) {
        const errData = await r.json().catch(() => ({}))
        setTextError(errData.error || `Erreur ${r.status}`)
        setTextLoading(false)
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
            if (data.error) { setTextError(data.error); break }
            if (data.text) {
              acc += data.text
              setGenerated(isHashtags ? `${baseText}\n\n${acc}` : acc)
            }
            if (data.done) {
              setTextLoading(false)
              textAbortRef.current = null
              return
            }
          } catch {}
        }
      }
      setTextLoading(false)
    } catch (err) {
      if (err.name !== 'AbortError') setTextError(err.message)
      setTextLoading(false)
    }
  }

  // ── Image de référence (img2img) : lecture + redimensionnement ──
  function handleRefFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgError('')
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 1024
        let { width, height } = img
        if (width > MAX || height > MAX) {
          const s = MAX / Math.max(width, height)
          width = Math.round(width * s); height = Math.round(height * s)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setRefImage({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl })
      }
      img.onerror = () => setImgError('Image illisible — essaie un autre fichier')
      img.src = reader.result
    }
    reader.onerror = () => setImgError('Lecture du fichier impossible')
    reader.readAsDataURL(file)
  }

  // ── Image generation ──
  async function runImageGeneration() {
    setImgError('')

    // Mode "à partir d'une image" (img2img via Gemini)
    if (imgSource === 'edit') {
      if (!refImage) { setImgError('Importe d\'abord une image de référence'); return }
      if (!imgPrompt.trim()) { setImgError('Décris la transformation souhaitée'); return }
      setImgResults([])
      setImgLoading(true)
      try {
        const r = await fetch('/api/ai/image-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: refImage.base64, mimeType: refImage.mimeType, prompt: imgPrompt.trim() })
        })
        const data = await r.json()
        if (!r.ok) setImgError(data.error || `Erreur ${r.status}`)
        else if (data.urls?.length) setImgResults(data.urls)
        else setImgError('Aucune image générée')
      } catch (err) {
        setImgError(err.message)
      } finally {
        setImgLoading(false)
      }
      return
    }

    // Mode "rechercher une photo" (photos stock par mots-clés)
    if (!imgPrompt.trim()) return
    setImgResults([])
    setImgLoading(true)
    try {
      const r = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt.trim(), aspectRatio: imgRatio, count: 4 })
      })
      const data = await r.json()
      if (!r.ok) {
        setImgError(data.error || `Erreur ${r.status}`)
      } else if (data.urls?.length) {
        setImgResults(data.urls)
      } else {
        setImgError('Aucune image générée')
      }
    } catch (err) {
      setImgError(err.message)
    } finally {
      setImgLoading(false)
    }
  }

  async function handleAddImage(url, idx) {
    setAddingImageIdx(idx)
    try {
      // Download the image and convert to File
      const r = await fetch(url)
      if (!r.ok) throw new Error('Téléchargement échoué')
      const blob = await r.blob()
      const ext = (blob.type.split('/')[1] || 'webp').replace('jpeg', 'jpg')
      const filename = `ai-${Date.now()}.${ext}`
      const file = new File([blob], filename, { type: blob.type })
      await onAddImage(file)
      onClose()
    } catch (err) {
      setImgError('Erreur ajout image: ' + err.message)
      setAddingImageIdx(null)
    }
  }

  function handleInsertText() {
    onInsert(generated)
    onClose()
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={textLoading || imgLoading ? undefined : onClose}
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
        <div className={`bg-cream md:rounded-2xl rounded-t-3xl shadow-2xl border border-warm-200 w-full md:max-w-xl max-h-[92vh] flex flex-col overflow-hidden transition-transform duration-200 ${
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
                <p className="text-warm-500 text-[11px]">
                  {tab === 'text' ? 'Claude · ton style massage' : 'Photos bien-être · prêtes à publier'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={textLoading || imgLoading}
              className="w-9 h-9 rounded-full flex items-center justify-center text-warm-500 hover:bg-warm-100 active:bg-warm-200 disabled:opacity-40 transition-colors"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-warm-200 bg-warm-50">
            <button
              onClick={() => setTab('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === 'text'
                  ? 'text-sage-700 bg-cream border-b-2 border-sage-600'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              <Type size={15} />
              Texte
            </button>
            <button
              onClick={() => setTab('image')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === 'image'
                  ? 'text-sage-700 bg-cream border-b-2 border-sage-600'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              <ImageIcon size={15} />
              Image
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* ─── TEXT TAB ─── */}
            {tab === 'text' && (
              <>
                {!generated && !textLoading && (
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

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => runTextGeneration({ mode: 'generate' })}
                        disabled={!topic.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20"
                      >
                        <Sparkles size={16} />
                        Générer 1 post
                      </button>
                      <button
                        onClick={() => runTextGeneration({ mode: 'variations' })}
                        disabled={!topic.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-sage-700 bg-sage-100 hover:bg-sage-200 active:bg-sage-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-sage-300"
                      >
                        <RefreshCw size={16} />
                        3 versions
                      </button>
                    </div>
                  </>
                )}

                {textLoading && !generated && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={32} className="text-sage-600 animate-spin" />
                    <p className="text-sm text-warm-500">Claude rédige…</p>
                  </div>
                )}

                {generated && (
                  <div>
                    <label className="text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                      Résultat
                      {textLoading && <Loader2 size={11} className="animate-spin text-sage-600" />}
                    </label>
                    <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-[15px] text-warm-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                      {generated}
                      {textLoading && <span className="inline-block w-1.5 h-4 bg-sage-500 align-middle ml-0.5 animate-pulse" />}
                    </div>

                    {!textLoading && (
                      <div className="mt-3">
                        <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-1.5">Affiner</p>
                        <div className="flex flex-wrap gap-1.5">
                          {REFINE_ACTIONS.map(({ id, label, icon: Icon }) => (
                            <button
                              key={id}
                              onClick={() => runTextGeneration({ mode: id })}
                              className="flex items-center gap-1.5 text-xs text-warm-600 bg-cream hover:bg-warm-50 active:bg-warm-100 border border-warm-200 hover:border-warm-300 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              <Icon size={12} />
                              {label}
                            </button>
                          ))}
                          <button
                            onClick={() => runTextGeneration({ mode: mode === 'variations' ? 'variations' : 'generate' })}
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

                {textError && (
                  <div className="bg-[#FBEEEA] border border-[#E5C8BD] text-[#B07060] text-xs rounded-lg px-3 py-2.5">
                    {textError}
                  </div>
                )}
              </>
            )}

            {/* ─── IMAGE TAB ─── */}
            {tab === 'image' && (
              <>
                {imgResults.length === 0 && !imgLoading && (
                  <>
                    {/* Sous-mode : rechercher une photo vs transformer une image */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { setImgSource('search'); setImgError('') }}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                          imgSource === 'search'
                            ? 'border-sage-500 bg-sage-100 text-sage-700'
                            : 'border-warm-200 bg-warm-50 text-warm-500 hover:border-warm-300'
                        }`}
                      >
                        <ImageIcon size={14} /> Rechercher une photo
                      </button>
                      <button
                        onClick={() => { setImgSource('edit'); setImgError('') }}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                          imgSource === 'edit'
                            ? 'border-sage-500 bg-sage-100 text-sage-700'
                            : 'border-warm-200 bg-warm-50 text-warm-500 hover:border-warm-300'
                        }`}
                      >
                        <Wand2 size={14} /> À partir d'une image
                      </button>
                    </div>

                    {/* Mode img2img : import de l'image de référence */}
                    {imgSource === 'edit' && (
                      <div>
                        <label className="block text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2">
                          Image de référence
                        </label>
                        <input ref={refFileRef} type="file" accept="image/*" onChange={handleRefFile} className="hidden" />
                        {refImage ? (
                          <div className="relative rounded-xl overflow-hidden border border-warm-200">
                            <img src={refImage.preview} alt="référence" className="w-full max-h-48 object-cover" />
                            <button
                              onClick={() => { setRefImage(null); if (refFileRef.current) refFileRef.current.value = '' }}
                              className="absolute top-2 right-2 bg-warm-800/70 text-white rounded-full px-2.5 py-1 text-[11px] hover:bg-warm-800"
                            >
                              Changer
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => refFileRef.current?.click()}
                            className="w-full flex flex-col items-center justify-center gap-1.5 py-6 rounded-xl border-2 border-dashed border-warm-300 bg-warm-50 hover:border-sage-400 hover:bg-sage-50 transition-colors text-warm-500"
                          >
                            <ImageIcon size={22} className="text-sage-600" />
                            <span className="text-xs font-medium">Importer une image</span>
                            <span className="text-[10px] text-warm-400">photo de ta salle, un produit, une ambiance…</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2">
                        {imgSource === 'edit' ? 'Décris la transformation' : 'Décris l\'image que tu veux'}
                      </label>
                      <textarea
                        value={imgPrompt}
                        onChange={e => setImgPrompt(e.target.value)}
                        placeholder={imgSource === 'edit'
                          ? 'ex: ambiance spa zen, lumière dorée douce, ajoute des bougies et des galets…'
                          : 'ex: huile de massage dorée versée sur des galets de bois clair…'}
                        rows={3}
                        className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-[15px] text-warm-700 placeholder-warm-400 outline-none focus:border-sage-500 transition-colors resize-none"
                      />
                      <p className="text-[10px] text-warm-400 mt-1.5">
                        {imgSource === 'edit'
                          ? '💡 L\'IA transforme ton image selon ta consigne (powered by Gemini)'
                          : '💡 Tu peux écrire en français — un style « ambiance bien-être » est ajouté automatiquement'}
                      </p>
                    </div>

                    {imgSource === 'search' && (
                      <>
                        <div>
                          <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-2">Style de référence</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {IMAGE_PRESETS.map(({ id, label, icon: Icon, prompt }) => (
                              <button
                                key={id}
                                onClick={() => setImgPrompt(prompt)}
                                className="flex items-center gap-2 text-xs text-warm-600 bg-warm-50 hover:bg-warm-100 active:bg-warm-200 border border-warm-200 hover:border-warm-300 rounded-lg px-2.5 py-2 transition-colors text-left"
                              >
                                <Icon size={14} className="text-sage-600 flex-shrink-0" />
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold mb-2">Format</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {IMAGE_RATIOS.map(({ id, label, desc, icon: Icon }) => (
                              <button
                                key={id}
                                onClick={() => setImgRatio(id)}
                                title={desc}
                                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-[10px] font-medium transition-all border ${
                                  imgRatio === id
                                    ? 'border-sage-500 bg-sage-100 text-sage-700'
                                    : 'border-warm-200 bg-warm-50 text-warm-500 hover:border-warm-300'
                                }`}
                              >
                                <Icon size={14} />
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      onClick={runImageGeneration}
                      disabled={imgSource === 'edit' ? (!refImage || !imgPrompt.trim()) : !imgPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20"
                    >
                      {imgSource === 'edit' ? <Wand2 size={16} /> : <Sparkles size={16} />}
                      {imgSource === 'edit' ? 'Transformer l\'image' : 'Générer 4 images'}
                    </button>
                  </>
                )}

                {imgLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={32} className="text-sage-600 animate-spin" />
                    <p className="text-sm text-warm-500">{imgSource === 'edit' ? 'Gemini transforme ton image… (quelques secondes)' : 'Préparation…'}</p>
                  </div>
                )}

                {imgResults.length > 0 && (
                  <div>
                    <p className="text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2">
                      Choisis l'image que tu veux utiliser
                    </p>
                    <p className="text-[11px] text-warm-400 mb-2">
                      ⏳ Quelques secondes pour charger les photos
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {imgResults.map((url, i) => (
                        <ImageResult
                          key={url}
                          url={url}
                          idx={i}
                          onSelect={handleAddImage}
                          adding={addingImageIdx === i}
                          disabled={addingImageIdx !== null}
                        />
                      ))}
                    </div>

                    <button
                      onClick={runImageGeneration}
                      disabled={addingImageIdx !== null}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-sage-700 bg-sage-100 hover:bg-sage-200 active:bg-sage-300 disabled:opacity-40 transition-all border border-sage-300"
                    >
                      <RefreshCw size={14} />
                      {imgSource === 'edit' ? 'Transformer à nouveau' : 'Générer 4 autres'}
                    </button>
                  </div>
                )}

                {imgError && (
                  <div className="bg-[#FBEEEA] border border-[#E5C8BD] text-[#B07060] text-xs rounded-lg px-3 py-2.5">
                    {imgError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer (Text tab only — Image inserts directly) */}
          {tab === 'text' && generated && !textLoading && (
            <div className="border-t border-warm-200 px-5 py-3 flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-warm-200 hover:bg-warm-50 active:bg-warm-100 text-warm-600 text-sm font-medium rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleInsertText}
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
