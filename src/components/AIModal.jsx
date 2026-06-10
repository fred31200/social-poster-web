'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, X, Loader2, RefreshCw, Check, Wand2, Scissors, Hash, Smile, Maximize2,
  Type, ImageIcon, Square, RectangleVertical, RectangleHorizontal, Leaf, Flower2, Soup, Heart, Plus,
  Mountain, Hand, Droplets, Coffee, Gem, Sunrise, Moon, Sprout, Waves, Flower, Flame, Wind, Copy
} from 'lucide-react'

// Large réservoir d'idées (spiritualité au sens large : énergétique, astro,
// lithothérapie, dév. perso, saisons, rituels, ayurveda, pleine conscience…).
// On en tire 6 au hasard à chaque ouverture pour varier les suggestions.
const QUICK_TOPICS_POOL = [
  // Cycles, lune & astrologie
  'Poser une intention à la nouvelle lune',
  'Ce que la pleine lune réveille en nous',
  'Vivre la saison selon son signe astral',
  'Les cycles de la nature comme guides intérieurs',
  // Énergétique & subtil
  'Rééquilibrer ses chakras au quotidien',
  'Se reconnecter à son énergie vitale (prana / chi)',
  'Les cristaux et leurs bienfaits subtils',
  'Nettoyer son espace et son énergie',
  // Développement personnel
  'Lâcher-prise : ce que ça veut vraiment dire',
  'Poser ses limites avec douceur',
  'Cultiver la gratitude au quotidien',
  'Apprivoiser son enfant intérieur',
  'Sortir du mental qui s\'emballe',
  'Faire la paix avec ses émotions',
  'Ralentir dans un monde qui va trop vite',
  // Corps, souffle & ayurveda
  'Le rituel du matin pour aligner corps et esprit',
  'Le souffle comme ancrage',
  'Les bienfaits du massage abhyanga',
  'Connaître son dosha pour mieux s\'équilibrer',
  'Manger en pleine conscience',
  'Le sommeil, ce soin sacré',
  // Méditation & présence
  'Méditation : 3 minutes pour revenir à soi',
  'Cultiver la présence dans les petits gestes',
  'Créer une bulle de calme chez soi',
  // Nature & saisons
  'Se reconnecter à la nature au fil des saisons',
  'Le pouvoir apaisant de l\'eau et de la forêt',
  'Accueillir l\'énergie du changement de saison',
  // Rituels & soin de soi
  'Créer un rituel du soir apaisant',
  'Un bain rituel pour se régénérer',
  'S\'offrir un temps pour soi sans culpabiliser',
]

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// Idées rapides déjà utilisées pour générer un post → mémorisées (par navigateur)
// pour ne PLUS JAMAIS les reproposer dans la sélection.
const USED_TOPICS_KEY = 'sp_used_quick_topics'
function loadUsedTopics() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(USED_TOPICS_KEY) || '[]') } catch { return [] }
}
function saveUsedTopics(arr) {
  try { localStorage.setItem(USED_TOPICS_KEY, JSON.stringify(arr)) } catch {}
}
function pickFreshTopics(n, used) {
  return pickRandom(QUICK_TOPICS_POOL.filter(t => !used.includes(t)), n)
}

const REFINE_ACTIONS = [
  { id: 'shorter',     label: 'Plus court',  icon: Scissors },
  { id: 'longer',      label: 'Plus long',   icon: Maximize2 },
  { id: 'more-pro',    label: 'Plus pro',    icon: Wand2 },
  { id: 'with-emojis', label: '+ Emojis',    icon: Smile },
  { id: 'hashtags',    label: 'Hashtags',    icon: Hash },
]

// Réservoir large de styles/scènes (on en tire 6 au hasard, rafraîchissables).
const IMAGE_PRESETS_POOL = [
  { id: 'zen',       label: 'Ambiance zen',       icon: Leaf,     prompt: 'Espace de méditation paisible avec bougies, encens qui fume doucement, coussins, tons neutres et boisés, lumière dorée du matin' },
  { id: 'cosmique',  label: 'Spirituel / cosmos', icon: Sparkles, prompt: 'Illustration spirituelle onirique — phases de la lune, étoiles, mandala doré sur fond bleu nuit profond, aquarelle délicate' },
  { id: 'nature',    label: 'Nature & éléments',  icon: Mountain, prompt: 'Nature apaisante au lever du soleil — forêt brumeuse, eau calme, pierres empilées en équilibre, lumière douce et spirituelle' },
  { id: 'energie',   label: 'Énergie & soin',     icon: Heart,    prompt: 'Mains en geste de soin énergétique, lumière douce entre les paumes, cristaux et plantes, atmosphère sereine et lumineuse' },
  { id: 'massage',   label: 'Massage & toucher',  icon: Hand,     prompt: 'Détail intime d\'un massage : des mains qui massent un dos avec de l\'huile chaude, serviettes blanches, lumière dorée tamisée, ambiance spa feutrée' },
  { id: 'spa',       label: 'Cocon spa',          icon: Droplets, prompt: 'Composition spa cocooning : serviettes roulées, bougies allumées, fleurs de frangipanier, bol d\'eau et galets, lumière chaude et douce' },
  { id: 'the',       label: 'Rituel du thé',      icon: Coffee,   prompt: 'Rituel du thé : théière, tasse fumante, tisane aux herbes, table en bois clair, vapeur délicate, lumière douce du matin, sérénité' },
  { id: 'cristaux',  label: 'Pierres & cristaux', icon: Gem,      prompt: 'Cristaux de lithothérapie (améthyste, quartz rose) posés sur du bois, lumière douce qui les fait scintiller, ambiance feutrée et apaisante' },
  { id: 'lever',     label: 'Lever de soleil',    icon: Sunrise,  prompt: 'Paysage au lever du soleil, brume légère sur un lac calme, lumière dorée et rosée, reflets, profonde sérénité' },
  { id: 'lune',      label: 'Pleine lune',        icon: Moon,     prompt: 'Nuit douce sous une pleine lune, ciel étoilé, silhouettes d\'arbres, atmosphère contemplative et apaisante' },
  { id: 'foret',     label: 'Forêt ressourçante', icon: Sprout,   prompt: 'Forêt verdoyante baignée d\'une lumière douce filtrant entre les arbres, mousse, fougères, rayons dorés, calme profond' },
  { id: 'eau',       label: 'Eau & sérénité',     icon: Waves,    prompt: 'Surface d\'eau calme et claire, reflets doux, gouttes délicates, nénuphar, lumière apaisante, sensation de pureté' },
  { id: 'fleurs',    label: 'Fleurs délicates',   icon: Flower,   prompt: 'Fleurs délicates (lotus, orchidée blanche) posées sur l\'eau, pétales, lumière douce et poétique, fond épuré' },
  { id: 'bougies',   label: 'Lumière des bougies',icon: Flame,    prompt: 'Plusieurs bougies allumées dans une douce pénombre, lumière chaude et dansante, ambiance intime et apaisante' },
  { id: 'yoga',      label: 'Yoga & souffle',     icon: Wind,     prompt: 'Tapis de yoga déroulé près d\'une fenêtre lumineuse, plante verte, lumière douce du matin, ambiance calme et inspirante' },
]

const IMAGE_RATIOS = [
  { id: '1:1',  label: '1:1',    desc: 'Carré (Instagram)',  icon: Square },
  { id: '4:5',  label: '4:5',    desc: 'Portrait (IG feed)', icon: RectangleVertical },
  { id: '16:9', label: '16:9',   desc: 'Paysage (FB/LI)',    icon: RectangleHorizontal },
  { id: '9:16', label: '9:16',   desc: 'Story / Reel',       icon: RectangleVertical },
]

// ImageResult sub-component — handles per-image loading state since
// Pollinations.ai generates server-side when the browser hits the URL
function ImageResult({ url, idx, onSelect, onCopy, copied, adding, disabled }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  return (
    <button
      onClick={() => loaded && !error && onSelect(url, idx)}
      disabled={disabled || !loaded || error}
      className="relative aspect-square rounded-xl overflow-hidden border-2 border-warm-200 hover:border-sage-500 active:border-sage-600 transition-all group disabled:opacity-50 bg-warm-100"
    >
      {loaded && !error && onCopy && (
        <span
          role="button"
          tabIndex={0}
          title="Copier l'image (pour la coller sur Facebook)"
          onClick={(e) => { e.stopPropagation(); onCopy(url, idx) }}
          className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 bg-white/90 hover:bg-white text-sage-700 rounded-lg px-2 py-1 text-[10px] font-semibold shadow-sm cursor-pointer transition-colors"
        >
          {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
        </span>
      )}
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
  const [usedTopics, setUsedTopics] = useState(() => loadUsedTopics()) // idées déjà utilisées (persistées par navigateur)
  const [quickTopics, setQuickTopics] = useState(() => pickFreshTopics(6, loadUsedTopics())) // 6 idées fraîches (jamais utilisées)
  const [textImage, setTextImage] = useState(null) // { base64, mimeType, preview } — écrire À PARTIR d'une image
  const textAbortRef = useRef(null)
  const textFileRef = useRef(null)

  // ── Image state ──
  const [imgPrompt, setImgPrompt] = useState('')
  const [imgRatio, setImgRatio] = useState('1:1')
  const [imgResults, setImgResults] = useState([]) // array of URLs
  const [imgLoading, setImgLoading] = useState(false)
  const [imgError, setImgError] = useState('')
  const [addingImageIdx, setAddingImageIdx] = useState(null)
  // Sous-mode de l'onglet Image : 'search' (Décrire) | 'post' | 'edit' (img2img)
  const [imgSource, setImgSource] = useState('search')
  const [refImage, setRefImage] = useState(null) // { base64, mimeType, preview }
  const [imgPresets, setImgPresets] = useState(() => pickRandom(IMAGE_PRESETS_POOL, 6)) // 6 styles tirés au hasard
  const refFileRef = useRef(null)

  // ── Copie manuelle (coller le post sur son mur perso Facebook) ──
  const [copied, setCopied] = useState(false)        // texte copié
  const [copiedImgIdx, setCopiedImgIdx] = useState(null) // image copiée (index)

  // Reset when opening
  useEffect(() => {
    if (open) {
      setTopic('')
      setGenerated('')
      setTextError('')
      setMode('generate')
      setUsedTopics(loadUsedTopics())
      setQuickTopics(pickFreshTopics(6, loadUsedTopics()))
      setTextImage(null)
      setCopied(false)
      setCopiedImgIdx(null)
      setImgPrompt('')
      setImgResults([])
      setImgError('')
      setAddingImageIdx(null)
      setImgSource('search')
      setRefImage(null)
      setImgPresets(pickRandom(IMAGE_PRESETS_POOL, 6))
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
  // Marque une idée rapide comme « utilisée » : retirée de l'affichage + mémorisée (plus jamais reproposée).
  function markQuickTopicUsed(t) {
    const s = (t || '').trim()
    if (!s || !QUICK_TOPICS_POOL.includes(s)) return
    setUsedTopics(prev => {
      if (prev.includes(s)) return prev
      const next = [...prev, s]
      saveUsedTopics(next)
      return next
    })
    setQuickTopics(prev => prev.filter(x => x !== s))
  }

  async function runTextGeneration({ mode: m, customCurrentText }) {
    setTextError('')
    // Si on génère un post à partir d'une idée rapide, on ne la reproposera plus.
    if (m === 'generate' || m === 'variations') markQuickTopicUsed(topic)
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
      // Écrire à partir d'une image : seulement pour une (re)génération de post.
      if ((m === 'generate' || m === 'variations') && textImage) {
        body.imageBase64 = textImage.base64
        body.mimeType = textImage.mimeType
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

  // ── Lecture + redimensionnement (max 1024px) → { base64, mimeType, preview } ──
  function readResizedImage(file, onReady, onErr) {
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
        onReady({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl })
      }
      img.onerror = () => onErr('Image illisible — essaie un autre fichier')
      img.src = reader.result
    }
    reader.onerror = () => onErr('Lecture du fichier impossible')
    reader.readAsDataURL(file)
  }

  // Image de référence (img2img, onglet Image)
  function handleRefFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgError('')
    readResizedImage(file, setRefImage, setImgError)
  }

  // Image source pour écrire un post (onglet Texte)
  function handleTextRefFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setTextError('')
    readResizedImage(file, setTextImage, setTextError)
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

    // Mode "depuis mon post" : Gemini illustre le post (image cohérente avec le texte)
    if (imgSource === 'post') {
      const postText = (generated.trim() || (currentText || '').trim())
      if (!postText) { setImgError('Écris d\'abord un post à illustrer (onglet « Texte »)'); return }
      setImgResults([])
      setImgLoading(true)
      try {
        const r = await fetch('/api/ai/image-from-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postText })
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

    // Mode "Décrire" : Gemini génère une image cohérente avec la description
    if (!imgPrompt.trim()) return
    setImgResults([])
    setImgLoading(true)
    try {
      const r = await fetch('/api/ai/image-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt.trim() })
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

  // Ouvre WhatsApp avec le post prêt à envoyer (client, groupe, liste de diffusion —
  // ou copier-coller vers le Statut). wa.me ne transporte que le texte ; pour
  // l'image, utiliser le bouton « Copier » sur l'image générée.
  function handleShareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(generated)}`, '_blank', 'noopener')
  }

  // Copie le texte du post dans le presse-papier (pour le coller à la main, ex: mur Facebook perso)
  async function handleCopyText() {
    const text = generated || ''
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Repli navigateurs anciens / contexte non sécurisé
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1900)
  }

  // Copie une image générée dans le presse-papier (PNG — seul format fiable). Repli: téléchargement.
  async function handleCopyImage(url, idx) {
    try {
      const item = new ClipboardItem({
        'image/png': (async () => {
          const r = await fetch(url)
          const blob = await r.blob()
          const bmp = await createImageBitmap(blob)
          const c = document.createElement('canvas')
          c.width = bmp.width; c.height = bmp.height
          c.getContext('2d').drawImage(bmp, 0, 0)
          return await new Promise((res) => c.toBlob(res, 'image/png'))
        })(),
      })
      await navigator.clipboard.write([item])
      setCopiedImgIdx(idx)
      setTimeout(() => setCopiedImgIdx(null), 1900)
    } catch {
      // Repli fiable : on télécharge l'image (l'utilisateur l'ajoute ensuite à son post FB)
      try {
        const r = await fetch(url)
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `image-${Date.now()}.jpg`
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(a.href)
        setCopiedImgIdx(idx)
        setTimeout(() => setCopiedImgIdx(null), 1900)
      } catch {
        setImgError('Copie de l\'image impossible — fais un clic droit sur l\'image puis « Enregistrer ».')
      }
    }
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
                  {tab === 'text' ? 'Claude · ton style massage' : 'Images IA · ambiance bien-être'}
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

                    {/* …ou écrire à partir d'une image */}
                    <div>
                      <input ref={textFileRef} type="file" accept="image/*" onChange={handleTextRefFile} className="hidden" />
                      {textImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-sage-300">
                          <img src={textImage.preview} alt="inspiration" className="w-full max-h-44 object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-warm-900/75 to-transparent px-3 py-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-white font-medium flex items-center gap-1.5">
                              <ImageIcon size={12} /> J'écris en m'inspirant de cette image
                            </span>
                            <button
                              onClick={() => { setTextImage(null); if (textFileRef.current) textFileRef.current.value = '' }}
                              className="shrink-0 bg-warm-900/50 text-white rounded-full px-2.5 py-1 text-[11px] hover:bg-warm-900/70 transition-colors"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => textFileRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-warm-300 bg-warm-50 hover:border-sage-400 hover:bg-sage-50/60 text-warm-500 hover:text-sage-700 text-xs font-medium transition-colors"
                        >
                          <ImageIcon size={14} /> …ou écrire à partir d&apos;une image
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold">Idées rapides</p>
                        <button
                          onClick={() => setQuickTopics(pickFreshTopics(6, loadUsedTopics()))}
                          className="flex items-center gap-1 text-[10px] text-sage-600 hover:text-sage-700 font-medium transition-colors"
                        >
                          <RefreshCw size={11} /> Autres idées
                        </button>
                      </div>
                      {quickTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {quickTopics.map((t, i) => (
                            <button
                              key={i}
                              onClick={() => setTopic(t)}
                              className="text-xs text-warm-600 bg-warm-50 hover:bg-warm-100 active:bg-warm-200 border border-warm-200 hover:border-warm-300 rounded-lg px-2.5 py-1.5 transition-colors text-left max-w-full"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-warm-400 italic">
                          Tu as fait le tour de toutes les idées ✨{' '}
                          <button
                            onClick={() => { saveUsedTopics([]); setUsedTopics([]); setQuickTopics(pickFreshTopics(6, [])) }}
                            className="not-italic text-sage-600 hover:text-sage-700 font-medium underline"
                          >
                            tout réafficher
                          </button>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => runTextGeneration({ mode: 'generate' })}
                        disabled={!topic.trim() && !textImage}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20"
                      >
                        <Sparkles size={16} />
                        {textImage ? 'Écrire depuis l\'image' : 'Générer 1 post'}
                      </button>
                      <button
                        onClick={() => runTextGeneration({ mode: 'variations' })}
                        disabled={!topic.trim() && !textImage}
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
                    {textLoading ? (
                      <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-[15px] text-warm-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                        {generated}
                        <span className="inline-block w-1.5 h-4 bg-sage-500 align-middle ml-0.5 animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={generated}
                          onChange={e => setGenerated(e.target.value)}
                          rows={Math.min(14, Math.max(6, generated.split('\n').length + 2))}
                          className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-[15px] text-warm-700 leading-relaxed outline-none focus:border-sage-500 transition-colors resize-y"
                        />
                        <p className="text-[10px] text-warm-400 mt-1">✏️ Tu peux modifier le texte directement ici avant de l'utiliser.</p>
                      </>
                    )}

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
                    {/* Sous-mode : une photo stock / depuis le post / img2img */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => { setImgSource('search'); setImgError('') }}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[10px] font-medium leading-tight text-center border transition-all ${
                          imgSource === 'search'
                            ? 'border-sage-500 bg-sage-100 text-sage-700'
                            : 'border-warm-200 bg-warm-50 text-warm-500 hover:border-warm-300'
                        }`}
                      >
                        <Sparkles size={15} /> Décrire
                      </button>
                      <button
                        onClick={() => { setImgSource('post'); setImgError('') }}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[10px] font-medium leading-tight text-center border transition-all ${
                          imgSource === 'post'
                            ? 'border-sage-500 bg-sage-100 text-sage-700'
                            : 'border-warm-200 bg-warm-50 text-warm-500 hover:border-warm-300'
                        }`}
                      >
                        <Type size={15} /> Depuis mon post
                      </button>
                      <button
                        onClick={() => { setImgSource('edit'); setImgError('') }}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[10px] font-medium leading-tight text-center border transition-all ${
                          imgSource === 'edit'
                            ? 'border-sage-500 bg-sage-100 text-sage-700'
                            : 'border-warm-200 bg-warm-50 text-warm-500 hover:border-warm-300'
                        }`}
                      >
                        <Wand2 size={15} /> À partir d'une image
                      </button>
                    </div>

                    {/* Mode "depuis mon post" : aperçu du post à illustrer */}
                    {imgSource === 'post' && (
                      <div>
                        <label className="block text-xs text-warm-500 uppercase tracking-wider font-semibold mb-2">
                          Le post à illustrer
                        </label>
                        {(generated.trim() || (currentText || '').trim()) ? (
                          <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-[13px] text-warm-600 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                            {generated.trim() || (currentText || '').trim()}
                          </div>
                        ) : (
                          <div className="bg-warm-50 border border-dashed border-warm-300 rounded-xl px-4 py-5 text-center text-xs text-warm-500">
                            ✍️ Écris d'abord un post (onglet « Texte » ou dans le composer), puis reviens ici.
                          </div>
                        )}
                        <p className="text-[10px] text-warm-400 mt-1.5">
                          💡 L'IA crée une image qui colle au thème et à l'ambiance de ton post (powered by Gemini)
                        </p>
                      </div>
                    )}

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

                    {imgSource !== 'post' && (
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
                            : '💡 L\'IA crée une image fidèle à ta description, en ambiance bien-être (powered by Gemini)'}
                        </p>
                      </div>
                    )}

                    {imgSource === 'search' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] text-warm-400 uppercase tracking-wider font-semibold">Style de référence</p>
                          <button
                            onClick={() => setImgPresets(pickRandom(IMAGE_PRESETS_POOL, 6))}
                            className="flex items-center gap-1 text-[10px] text-sage-600 hover:text-sage-700 font-medium transition-colors"
                          >
                            <RefreshCw size={11} /> Autres styles
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {imgPresets.map(({ id, label, icon: Icon, prompt }) => (
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
                    )}

                    <button
                      onClick={runImageGeneration}
                      disabled={
                        imgSource === 'edit' ? (!refImage || !imgPrompt.trim())
                        : imgSource === 'post' ? !(generated.trim() || (currentText || '').trim())
                        : !imgPrompt.trim()
                      }
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-sage-600 hover:bg-sage-500 active:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-sage-500/20"
                    >
                      {imgSource === 'edit' ? <Wand2 size={16} /> : <Sparkles size={16} />}
                      {imgSource === 'edit' ? 'Transformer l\'image' : imgSource === 'post' ? 'Créer l\'image du post' : 'Créer l\'image'}
                    </button>
                  </>
                )}

                {imgLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={32} className="text-sage-600 animate-spin" />
                    <p className="text-sm text-warm-500">{imgSource === 'edit' ? 'Gemini transforme ton image… (quelques secondes)' : 'Gemini crée ton image… (quelques secondes)'}</p>
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
                          onCopy={handleCopyImage}
                          copied={copiedImgIdx === i}
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
                      {imgSource === 'edit' ? 'Transformer à nouveau' : 'Créer une autre image'}
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
                onClick={handleShareWhatsApp}
                title="Envoyer ce post sur WhatsApp (client, groupe, liste de diffusion)"
                className="shrink-0 flex items-center justify-center w-11 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 text-[#1da851] hover:bg-[#25D366]/20 active:bg-[#25D366]/30 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-label="WhatsApp">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                </svg>
              </button>
              <button
                onClick={handleCopyText}
                title="Copier le texte pour le coller à la main (mur Facebook perso, etc.)"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                  copied
                    ? 'bg-sage-600 border-sage-600 text-white'
                    : 'bg-white border-sage-300 text-sage-700 hover:bg-sage-50 active:bg-sage-100'
                }`}
              >
                {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier</>}
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
