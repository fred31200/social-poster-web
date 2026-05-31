/**
 * Receives uploaded files via FormData, stores them in a temp directory,
 * returns their local paths so the renderer can reference them when creating a post.
 *
 * Also (optionally) transforms images for Instagram if `igMode` field is present.
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { transformForInstagram, getImageMetadata } from '@/lib/image'

// On Vercel, /tmp is writable but ephemeral (reset between requests).
// In dev, we use .data/tmp for inspection convenience.
const TMP_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'sp-uploads')
  : path.join(process.cwd(), '.data', 'tmp')

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

export async function POST(req) {
  try {
    ensureTmp()
    const fd = await req.formData()
    const file = fd.get('file')
    const igMode = fd.get('igMode') // optional: 'square' | 'portrait' | 'landscape' | 'fit-square'

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const baseName = safeName(file.name || 'upload')
    const ext = path.extname(baseName) || '.jpg'

    // 1. Original file path
    const id = uuidv4().slice(0, 8)
    const origPath = path.join(TMP_DIR, `${id}-${baseName}`)
    fs.writeFileSync(origPath, buf)

    // 2. Optional: Instagram transformation → separate file
    let igPath = null
    let meta = null
    if (/^image\//.test(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(baseName)) {
      try { meta = await getImageMetadata(buf) } catch {}
      if (igMode) {
        const igBuf = await transformForInstagram(buf, igMode)
        igPath = path.join(TMP_DIR, `${id}-ig-${path.basename(baseName, ext)}.jpg`)
        fs.writeFileSync(igPath, igBuf)
      }
    }

    return NextResponse.json({
      success: true,
      path: origPath,
      igPath,
      meta,
      isVideo: /^video\//.test(file.type) || /\.(mp4|mov|avi|webm)$/i.test(baseName),
    })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Allow larger uploads (up to 50MB)
export const maxDuration = 60
