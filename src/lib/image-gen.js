/**
 * Génération d'images via Flux Schnell sur fal.ai.
 *
 * fal.ai offre 10$ de crédit gratuit au signup, et tarifs similaires à Replicate.
 * Flux Schnell coûte ~0,003$ par image (~3000 images pour 10$).
 *
 * Dimensions optimisées pour les réseaux sociaux (multiples de 16, ratios standards Insta/FB/LI).
 */

import { fal } from '@fal-ai/client'

// Style automatiquement ajouté pour les posts massage/ayurvéda
const STYLE_SUFFIX = ', soft natural lighting, calming wellness aesthetic, earthy tones, professional photography, shallow depth of field, high quality'

// Dimensions exactes optimisées pour chaque format social
const RATIO_DIMENSIONS = {
  '1:1':  { width: 1080, height: 1080 },   // Instagram carré, FB, LI
  '4:5':  { width: 1080, height: 1344 },   // Instagram portrait (1080×1350 mais doit être multiple de 16)
  '16:9': { width: 1920, height: 1088 },   // Facebook/LinkedIn paysage
  '9:16': { width: 1088, height: 1920 },   // Stories / Reels
}

let _configured = false
function configure() {
  if (_configured) return
  if (!process.env.FAL_KEY) {
    throw new Error("Clé fal.ai manquante : configure FAL_KEY dans Vercel → Settings → Environment Variables")
  }
  fal.config({ credentials: process.env.FAL_KEY })
  _configured = true
}

/**
 * Génère N images via Flux Schnell sur fal.ai.
 * @param {object} opts
 * @param {string} opts.prompt - description de l'image
 * @param {string} [opts.aspectRatio='1:1'] - '1:1' | '4:5' | '16:9' | '9:16'
 * @param {number} [opts.count=4] - nombre d'images (max 4)
 * @param {boolean} [opts.useStyleSuffix=true] - ajouter automatiquement le style suffix
 * @returns {Promise<string[]>} - URLs des images générées
 */
export async function generateImages({ prompt, aspectRatio = '1:1', count = 4, useStyleSuffix = true }) {
  if (!prompt || !prompt.trim()) throw new Error('Prompt manquant')

  const dimensions = RATIO_DIMENSIONS[aspectRatio]
  if (!dimensions) {
    throw new Error(`Aspect ratio invalide. Valides: ${Object.keys(RATIO_DIMENSIONS).join(', ')}`)
  }

  count = Math.min(Math.max(1, count), 4)

  configure()
  const fullPrompt = useStyleSuffix ? `${prompt.trim()}${STYLE_SUFFIX}` : prompt.trim()

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt: fullPrompt,
      image_size: dimensions,        // custom { width, height }
      num_inference_steps: 4,         // Schnell = 4 steps (très rapide, qualité optimale)
      num_images: count,
      enable_safety_checker: true,
    },
    logs: false,
  })

  // fal.subscribe returns { data: { images: [{ url, ... }, ...] }, requestId }
  const images = result?.data?.images || []
  const urls = images.map(img => img.url).filter(Boolean)

  if (urls.length === 0) {
    throw new Error('Aucune image générée (réponse fal.ai vide)')
  }
  return urls
}
