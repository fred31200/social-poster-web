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
  return sharp(buffer)
    .rotate()
    .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer()
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
