/**
 * Génération d'images — sources fiables.
 *
 * ⚠️ Pollinations.ai (ancienne source) est devenu payant/limité : il renvoie
 * désormais HTTP 402 "Payment Required" / "Queue full for IP" pour l'accès
 * anonyme → toutes les générations échouaient. Remplacé par :
 *
 *   1. Pexels   — si PEXELS_API_KEY est défini (clé gratuite sur pexels.com/api).
 *                 Vraies photos professionnelles, recherche par mots-clés. Qualité++
 *   2. LoremFlickr — sans aucune clé (fallback par défaut). Photos Flickr Creative
 *                 Commons par mots-clés. Fiable et gratuit (~1s/image).
 *
 * Toutes les URLs sont renvoyées via le proxy same-origin /api/ai/image/proxy
 * (le navigateur fait ensuite fetch().blob() pour télécharger l'image choisie —
 * ça impose le same-origin, sinon CORS bloque le téléchargement).
 */

const RATIO_DIMENSIONS = {
  '1:1':  { width: 1024, height: 1024, orientation: 'square' },
  '4:5':  { width: 1024, height: 1280, orientation: 'portrait' },
  '16:9': { width: 1280, height: 720,  orientation: 'landscape' },
  '9:16': { width: 720,  height: 1280, orientation: 'portrait' },
}

// Dictionnaire FR/EN → mots-clés EN (les tags Flickr/Pexels sont surtout en anglais).
// Seuls les mots reconnus sont gardés : ça filtre automatiquement le « bruit » FR.
const KEYWORDS = {
  massage: 'massage', masser: 'massage',
  bien: 'wellness', bienetre: 'wellness', wellness: 'wellness', wellbeing: 'wellness',
  zen: 'zen',
  meditation: 'meditation', mediter: 'meditation',
  bougie: 'candle', bougies: 'candle', candle: 'candle', candles: 'candle',
  encens: 'incense', incense: 'incense',
  coussin: 'cushion', coussins: 'cushion',
  lune: 'moon', moon: 'moon',
  etoile: 'stars', etoiles: 'stars', star: 'stars', stars: 'stars',
  mandala: 'mandala',
  foret: 'forest', forest: 'forest',
  brume: 'mist', brumeuse: 'mist', brumeux: 'mist', mist: 'mist',
  eau: 'water', water: 'water',
  pierre: 'stones', pierres: 'stones', galet: 'stones', galets: 'stones', stone: 'stones', stones: 'stones',
  main: 'hands', mains: 'hands', hand: 'hands', hands: 'hands',
  cristal: 'crystal', cristaux: 'crystal', crystal: 'crystal', crystals: 'crystal',
  plante: 'plants', plantes: 'plants', plant: 'plants', plants: 'plants',
  soleil: 'sunrise', lever: 'sunrise', sunrise: 'sunrise', sun: 'sunrise',
  fleur: 'flower', fleurs: 'flower', flower: 'flower', flowers: 'flower', floral: 'flower',
  lotus: 'lotus',
  yoga: 'yoga',
  soin: 'healing', soins: 'healing', healing: 'healing',
  energie: 'energy', energy: 'energy',
  nature: 'nature', naturel: 'nature', naturelle: 'nature',
  spa: 'spa',
  serenite: 'serenity', serein: 'serenity', sereine: 'serenity', serenity: 'serenity',
  paix: 'peace', paisible: 'peace', peace: 'peace',
  calme: 'calm', calm: 'calm',
  ayurveda: 'ayurveda', ayurvedique: 'ayurveda', ayurvedic: 'ayurveda',
  huile: 'oil', oil: 'oil',
  the: 'tea', tea: 'tea', infusion: 'tea', tisane: 'tea',
  relaxation: 'relaxation', detente: 'relaxation', relax: 'relaxation', relaxant: 'relaxation', relaxante: 'relaxation',
  spirituel: 'spiritual', spirituelle: 'spiritual', spiritual: 'spiritual',
  aquarelle: 'watercolor', watercolor: 'watercolor',
  dore: 'golden', doree: 'golden', golden: 'golden',
  montagne: 'mountain', mountain: 'mountain',
  plage: 'beach', beach: 'beach',
  ocean: 'ocean', mer: 'sea', sea: 'sea',
  bois: 'wood', wood: 'wood', wooden: 'wood',
  bambou: 'bamboo', bamboo: 'bamboo',
}

// Ancre toujours ajoutée : garantit des résultats « bien-être » même si les
// mots spécifiques ne correspondent à aucune photo.
const ANCHOR = 'wellness'

/** Convertit un prompt (FR ou EN) en mots-clés EN exploitables. */
function toKeywords(prompt) {
  const norm = prompt.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const words = norm.split(/[^a-z]+/).filter(Boolean)
  const out = []
  for (const w of words) {
    const en = KEYWORDS[w]
    if (en && !out.includes(en)) out.push(en)
  }
  if (out.length === 0) out.push('spa')
  return out.slice(0, 4)
}

/** Enveloppe une URL distante dans le proxy same-origin. */
function proxied(url) {
  return `/api/ai/image/proxy?url=${encodeURIComponent(url)}`
}

/** Pexels — photos pro par mots-clés (nécessite PEXELS_API_KEY). */
async function fromPexels({ keywords, dims, count, apiKey }) {
  const params = new URLSearchParams({
    query: keywords.join(' '),
    per_page: String(count * 3),
    orientation: dims.orientation,
  })
  const r = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey },
  })
  if (!r.ok) throw new Error(`Pexels ${r.status}`)
  const data = await r.json()
  const photos = data.photos || []
  if (photos.length === 0) throw new Error('Pexels: aucun résultat')
  return photos.slice(0, count).map(p =>
    proxied(p.src?.large2x || p.src?.large || p.src?.original)
  )
}

/** LoremFlickr — photos Flickr CC par mots-clés, sans clé. */
function fromLoremFlickr({ keywords, dims, count }) {
  // Mode AND (toutes les tags doivent matcher) → photos PERTINENTES et variées
  // selon le lock. Le mode /all (OR) donnait des photos aléatoires hors-sujet.
  // On garde le mot-clé principal + une ancre large pour garantir des résultats
  // tout en restant dans le thème bien-être.
  const primary = keywords[0] || 'spa'
  const secondary = primary === ANCHOR ? 'spa' : ANCHOR
  const tags = `${primary},${secondary}`
  const base = Math.floor(Math.random() * 100000)
  return Array.from({ length: count }, (_, i) => {
    const lock = base + i // lock différent → image différente
    return proxied(`https://loremflickr.com/${dims.width}/${dims.height}/${tags}?lock=${lock}`)
  })
}

/**
 * Construit N URLs d'images prêtes à utiliser en <img src> (via le proxy).
 * @returns {Promise<string[]>}
 */
export async function generateImages({ prompt, aspectRatio = '1:1', count = 4 }) {
  if (!prompt || !prompt.trim()) throw new Error('Prompt manquant')
  const dims = RATIO_DIMENSIONS[aspectRatio]
  if (!dims) {
    throw new Error(`Aspect ratio invalide. Valides: ${Object.keys(RATIO_DIMENSIONS).join(', ')}`)
  }
  count = Math.min(Math.max(1, count), 4)
  const keywords = toKeywords(prompt)

  const apiKey = process.env.PEXELS_API_KEY
  if (apiKey) {
    try {
      return await fromPexels({ keywords, dims, count, apiKey })
    } catch (e) {
      console.error('[image-gen] Pexels indisponible, fallback LoremFlickr:', e.message)
    }
  }
  return fromLoremFlickr({ keywords, dims, count })
}
