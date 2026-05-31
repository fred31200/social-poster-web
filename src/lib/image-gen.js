/**
 * Génération d'images via Pollinations.ai — GRATUIT, sans clé API.
 *
 * Pollinations utilise Flux Schnell en backend. L'API se résume à des URLs
 * du type `https://image.pollinations.ai/prompt/{prompt}?width=W&height=H&seed=N`
 * qui retournent directement l'image PNG générée.
 *
 * Les images sont générées à la volée (~5-10 sec). On déclenche la génération
 * côté serveur via fetch() pour s'assurer qu'elles sont prêtes avant de renvoyer
 * les URLs au client.
 */

// Style automatiquement ajouté pour les posts massage/ayurvéda
const STYLE_SUFFIX = ', soft natural lighting, calming wellness aesthetic, earthy tones, professional photography, shallow depth of field, high quality'

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/'

// Dimensions exactes optimisées pour chaque format social
const RATIO_DIMENSIONS = {
  '1:1':  { width: 1024, height: 1024 },   // Instagram carré, FB, LI
  '4:5':  { width: 1024, height: 1280 },   // Instagram portrait
  '16:9': { width: 1280, height: 720 },    // Facebook/LinkedIn paysage
  '9:16': { width: 720,  height: 1280 },   // Stories / Reels
}

/**
 * Génère N images via Pollinations.ai (Flux Schnell sous le capot).
 * @param {object} opts
 * @param {string} opts.prompt - description de l'image
 * @param {string} [opts.aspectRatio='1:1']
 * @param {number} [opts.count=4] - nombre d'images (max 4)
 * @param {boolean} [opts.useStyleSuffix=true]
 * @returns {Promise<string[]>} - URLs des images générées
 */
export async function generateImages({ prompt, aspectRatio = '1:1', count = 4, useStyleSuffix = true }) {
  if (!prompt || !prompt.trim()) throw new Error('Prompt manquant')

  const dims = RATIO_DIMENSIONS[aspectRatio]
  if (!dims) {
    throw new Error(`Aspect ratio invalide. Valides: ${Object.keys(RATIO_DIMENSIONS).join(', ')}`)
  }

  count = Math.min(Math.max(1, count), 4)

  const fullPrompt = useStyleSuffix ? `${prompt.trim()}${STYLE_SUFFIX}` : prompt.trim()
  const encodedPrompt = encodeURIComponent(fullPrompt)

  const buildUrl = (seed) => {
    const params = new URLSearchParams({
      width: dims.width,
      height: dims.height,
      model: 'flux',
      nologo: 'true',
      private: 'true',     // ne pas pousser dans le feed public
      enhance: 'false',    // garde notre prompt tel quel
      seed: seed.toString(),
    })
    return `${POLLINATIONS_BASE}${encodedPrompt}?${params}`
  }

  // Génère N seeds aléatoires différents → N images uniques
  const seeds = Array.from({ length: count }, () => Math.floor(Math.random() * 1_000_000))
  const urls = seeds.map(buildUrl)

  // Trigger generation server-side (Pollinations génère à la volée).
  // On attend que chaque image soit prête avant de renvoyer les URLs au client.
  const generated = await Promise.all(
    urls.map(async (url) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 55_000)
        const r = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        if (!r.ok) {
          console.error('[pollinations] HTTP', r.status, 'for', url)
          return null
        }
        // Consume body to ensure generation completes server-side (important on Pollinations)
        await r.arrayBuffer()
        return url
      } catch (e) {
        console.error('[pollinations] fetch error', e?.message)
        return null
      }
    })
  )

  const okUrls = generated.filter(Boolean)
  if (okUrls.length === 0) {
    throw new Error('Génération échouée — Pollinations.ai semble down ou surchargé. Retente dans 30 sec.')
  }
  return okUrls
}
