/**
 * Génération d'image À PARTIR d'une image (img2img / édition) via Gemini.
 *
 * Modèle : gemini-2.5-flash-image (Google Generative Language API).
 * Nécessite GEMINI_API_KEY + facturation Google activée (le tier gratuit image = 0).
 *
 * On envoie [consigne texte + image de référence (base64)] et Gemini renvoie
 * une nouvelle image (+ parfois un petit texte qu'on ignore).
 */

import axios from 'axios'

const MODEL = 'gemini-2.5-flash-image'
const ENDPOINT = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

/**
 * @param {object} opts
 * @param {string} opts.imageBase64 - image de référence en base64 (sans préfixe data:)
 * @param {string} [opts.mimeType='image/jpeg']
 * @param {string} opts.prompt - consigne de transformation
 * @param {string} opts.apiKey - GEMINI_API_KEY
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
export async function editImageWithGemini({ imageBase64, mimeType = 'image/jpeg', prompt, apiKey }) {
  if (!apiKey) throw new Error('Clé Gemini manquante — configure GEMINI_API_KEY (variables d\'env Vercel).')
  if (!imageBase64) throw new Error('Image de référence manquante')
  if (!prompt || !prompt.trim()) throw new Error('Décris la transformation souhaitée')

  const body = {
    contents: [{
      parts: [
        { text: prompt.trim() },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
    }],
  }

  let data
  try {
    const r = await axios.post(ENDPOINT(apiKey), body, {
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
  const parts = candidate?.content?.parts || []
  for (const p of parts) {
    const inl = p.inlineData || p.inline_data
    if (inl?.data) {
      return {
        buffer: Buffer.from(inl.data, 'base64'),
        mimeType: inl.mimeType || inl.mime_type || 'image/png',
      }
    }
  }

  // Pas d'image renvoyée (refus, sécurité, ou consigne ambiguë)
  const reason = candidate?.finishReason
  throw new Error(
    reason && reason !== 'STOP'
      ? `Gemini n'a pas pu générer l'image (${reason}). Reformule ta consigne.`
      : 'Gemini n\'a pas renvoyé d\'image — reformule ta consigne et réessaie.'
  )
}
