/**
 * Génération d'images via Pollinations.ai — GRATUIT, sans clé API.
 *
 * Pollinations utilise Flux Schnell. L'API se résume à des URLs du type
 * `https://image.pollinations.ai/prompt/{prompt}?width=W&height=H&seed=N`
 * qui retournent l'image PNG générée à la volée (~5-10 sec par image).
 *
 * On RETOURNE les URLs immédiatement — le navigateur fait le chargement direct,
 * ce qui évite les timeouts des fonctions serverless Vercel (10s en hobby tier).
 */

// Style automatiquement ajouté pour les posts massage/ayurvéda
const STYLE_SUFFIX = ', soft natural lighting, calming wellness aesthetic, earthy tones, professional photography, shallow depth of field, high quality'

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/'

// Dimensions optimisées pour chaque format social
const RATIO_DIMENSIONS = {
  '1:1':  { width: 1024, height: 1024 },
  '4:5':  { width: 1024, height: 1280 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720,  height: 1280 },
}

/**
 * Construit N URLs Pollinations avec différents seeds.
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.aspectRatio='1:1']
 * @param {number} [opts.count=4]
 * @param {boolean} [opts.useStyleSuffix=true]
 * @returns {string[]} URLs prêtes à utiliser en <img src>
 */
export function generateImages({ prompt, aspectRatio = '1:1', count = 4, useStyleSuffix = true }) {
  if (!prompt || !prompt.trim()) throw new Error('Prompt manquant')

  const dims = RATIO_DIMENSIONS[aspectRatio]
  if (!dims) {
    throw new Error(`Aspect ratio invalide. Valides: ${Object.keys(RATIO_DIMENSIONS).join(', ')}`)
  }

  count = Math.min(Math.max(1, count), 4)

  const fullPrompt = useStyleSuffix ? `${prompt.trim()}${STYLE_SUFFIX}` : prompt.trim()
  const encodedPrompt = encodeURIComponent(fullPrompt)

  const seeds = Array.from({ length: count }, () => Math.floor(Math.random() * 1_000_000))

  return seeds.map(seed => {
    const params = new URLSearchParams({
      width: dims.width,
      height: dims.height,
      seed: seed.toString(),
      nologo: 'true',
      model: 'flux',
    })
    const pollinationsUrl = `${POLLINATIONS_BASE}${encodedPrompt}?${params}`
    // Return a same-origin proxy URL — avoids browser CORS / timeout quirks
    // The proxy fetches Pollinations server-side via Vercel and streams the bytes back
    return `/api/ai/image/proxy?url=${encodeURIComponent(pollinationsUrl)}`
  })
}
