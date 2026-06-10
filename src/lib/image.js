/**
 * Image transformations using Sharp.
 * Returns a JPEG Buffer ready to upload (no temp files needed in web context).
 */

import sharp from 'sharp'

const TARGETS = {
  'square':     { w: 1080, h: 1080, fit: 'cover' },
  'portrait':   { w: 1080, h: 1350, fit: 'cover' },
  'landscape':  { w: 1080, h: 566,  fit: 'cover' },
  'fit-square': { w: 1080, h: 1080, fit: 'contain' },
  'story':      { w: 1080, h: 1920, fit: 'cover' }, // format Story Instagram 9:16
}

/**
 * @param {Buffer} buffer - the original image
 * @param {string} mode   - 'square' | 'portrait' | 'landscape' | 'fit-square'
 * @param {string} bgColor - background color for 'fit-square' (default white)
 * @returns {Promise<Buffer>} JPEG buffer
 */
export async function transformForInstagram(buffer, mode = 'square', bgColor = '#ffffff') {
  const t = TARGETS[mode] || TARGETS.square
  return sharp(buffer)
    .rotate() // auto-orient based on EXIF
    .resize({ width: t.w, height: t.h, fit: t.fit, background: bgColor })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
}

/**
 * Compresse/convertit une image en JPEG (plus léger et plus fiable à héberger
 * que les gros PNG renvoyés par Gemini, ~2 Mo → quelques centaines de Ko).
 */
export async function compressJpeg(buffer, maxDim = 1280, quality = 88) {
  const resized = await sharp(buffer)
    .rotate()
    .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
    .toBuffer()

  // Filigrane « Aux Graines du Bien-Être » en bas à droite — seules les images
  // GÉNÉRÉES PAR L'IA passent par cette fonction (pas les photos uploadées).
  // À remplacer par le logo PNG de Frédéric quand il le fournira.
  try {
    const { width = maxDim, height = maxDim } = await sharp(resized).metadata()
    const fontSize = Math.max(16, Math.round(width * 0.026))
    const pad = Math.round(fontSize * 0.8)
    const svg = Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="${width - pad}" y="${height - pad}" text-anchor="end" ` +
      `font-family="Georgia, serif" font-style="italic" font-size="${fontSize}" ` +
      `fill="#ffffff" fill-opacity="0.78" stroke="#000000" stroke-opacity="0.22" stroke-width="0.8">` +
      `Aux Graines du Bien-Être</text></svg>`
    )
    return await sharp(resized).composite([{ input: svg }]).jpeg({ quality, mozjpeg: true }).toBuffer()
  } catch {
    // Si le rendu du filigrane échoue (police indisponible…), on renvoie l'image telle quelle
    return sharp(resized).jpeg({ quality, mozjpeg: true }).toBuffer()
  }
}

export async function getImageMetadata(buffer) {
  const m = await sharp(buffer).metadata()
  return {
    width: m.width,
    height: m.height,
    format: m.format,
    ratio: m.width / m.height,
  }
}
