/**
 * Génération d'images via Gemini (gemini-2.5-flash-image).
 * Nécessite GEMINI_API_KEY + facturation Google activée (le tier gratuit image = 0).
 *
 *  - editImageWithGemini   : img2img (image de référence + consigne → nouvelle image)
 *  - generateImageFromText : texte → image (ex: illustrer un post)
 */

import axios from 'axios'

const MODEL = 'gemini-2.5-flash-image'
const ENDPOINT = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

/** Appel Gemini commun : envoie des "parts" et renvoie la 1re image trouvée. */
async function callGeminiImage(parts, apiKey) {
  if (!apiKey) throw new Error('Clé Gemini manquante — configure GEMINI_API_KEY (variables d\'env Vercel).')

  let data
  try {
    const r = await axios.post(ENDPOINT(apiKey), { contents: [{ parts }] }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
      maxBodyLength: Infinity,
    })
    data = r.data
  } catch (e) {
    const err = e.response?.data?.error
    if (err?.code === 429) {
      throw new Error('Quota Gemini dépassé (ou facturation Google non activée pour les images).')
    }
    throw new Error('Gemini: ' + (err?.message || e.message || 'échec de la requête'))
  }

  const candidate = data?.candidates?.[0]
  for (const p of (candidate?.content?.parts || [])) {
    const inl = p.inlineData || p.inline_data
    if (inl?.data) {
      return { buffer: Buffer.from(inl.data, 'base64'), mimeType: inl.mimeType || inl.mime_type || 'image/png' }
    }
  }

  const reason = candidate?.finishReason
  throw new Error(
    reason && reason !== 'STOP'
      ? `Gemini n'a pas pu générer l'image (${reason}). Reformule et réessaie.`
      : 'Gemini n\'a pas renvoyé d\'image — réessaie.'
  )
}

/**
 * img2img : transforme une image de référence selon une consigne.
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
export async function editImageWithGemini({ imageBase64, mimeType = 'image/jpeg', prompt, apiKey }) {
  if (!imageBase64) throw new Error('Image de référence manquante')
  if (!prompt || !prompt.trim()) throw new Error('Décris la transformation souhaitée')
  return callGeminiImage(
    [{ text: prompt.trim() }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
    apiKey
  )
}

/**
 * texte → image (ex: illustrer un post de réseau social).
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
export async function generateImageFromText({ prompt, apiKey }) {
  if (!prompt || !prompt.trim()) throw new Error('Prompt manquant')
  return callGeminiImage([{ text: prompt.trim() }], apiKey)
}
