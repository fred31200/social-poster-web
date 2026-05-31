/**
 * Génération d'images via Flux Schnell sur Replicate.
 *
 * Tarifs : ~0,003 USD par image (Schnell est le plus rapide/cheap des Flux).
 * Le modèle accepte des aspect ratios prédéfinis et génère en ~1-2 secondes.
 */

import Replicate from 'replicate'

// Style automatiquement ajouté pour les posts massage/ayurvéda — donne une
// cohérence visuelle "ambiance bien-être" sans que l'utilisateur ait à le retaper
const STYLE_SUFFIX = ', soft natural lighting, calming wellness aesthetic, earthy tones, professional photography, shallow depth of field, high quality'

const VALID_RATIOS = ['1:1', '16:9', '21:9', '3:2', '2:3', '4:5', '5:4', '3:4', '4:3', '9:16', '9:21']

let _client = null
function getClient() {
  if (_client) return _client
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("Token Replicate manquant : configure REPLICATE_API_TOKEN dans Vercel → Settings → Environment Variables")
  }
  _client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  return _client
}

/**
 * Génère N images via Flux Schnell.
 * @param {object} opts
 * @param {string} opts.prompt - description de l'image
 * @param {string} [opts.aspectRatio='1:1'] - format
 * @param {number} [opts.count=4] - nombre d'images (max 4)
 * @param {boolean} [opts.useStyleSuffix=true] - ajouter automatiquement le suffixe style
 * @returns {Promise<string[]>} - URLs des images générées
 */
export async function generateImages({ prompt, aspectRatio = '1:1', count = 4, useStyleSuffix = true }) {
  if (!prompt || !prompt.trim()) throw new Error('Prompt manquant')
  if (!VALID_RATIOS.includes(aspectRatio)) {
    throw new Error(`Aspect ratio invalide. Valides: ${VALID_RATIOS.join(', ')}`)
  }
  count = Math.min(Math.max(1, count), 4)

  const client = getClient()
  const fullPrompt = useStyleSuffix ? `${prompt.trim()}${STYLE_SUFFIX}` : prompt.trim()

  // Run Flux Schnell with num_outputs=count
  // Output is a list of URL strings (replicate returns ReadableStream or URL[])
  const output = await client.run(
    'black-forest-labs/flux-schnell',
    {
      input: {
        prompt: fullPrompt,
        aspect_ratio: aspectRatio,
        num_outputs: count,
        output_format: 'webp',
        output_quality: 90,
        // num_inference_steps: 4 (default for Schnell, very fast)
        // disable_safety_checker: false (keep default for prod safety)
      }
    }
  )

  // Normalize output to array of string URLs
  // Replicate's API returns FileOutput objects with .url() method, OR plain string URLs
  const urls = []
  const items = Array.isArray(output) ? output : [output]
  for (const item of items) {
    if (typeof item === 'string') {
      urls.push(item)
    } else if (item && typeof item.url === 'function') {
      urls.push(item.url().toString())
    } else if (item && item.url) {
      urls.push(typeof item.url === 'string' ? item.url : item.url.toString())
    }
  }

  if (urls.length === 0) throw new Error('Aucune image générée (réponse Replicate vide)')
  return urls
}
