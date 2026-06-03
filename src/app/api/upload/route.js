/**
 * Receives uploaded files via FormData and returns a reference the post flow
 * can use later when publishing.
 *
 * ⚠️ Serverless: /tmp is NOT shared across invocations on Vercel, so a file
 * written here would be gone by the time a (possibly scheduled) publish runs.
 * → In production we upload the bytes to a permanent public host (catbox) RIGHT
 *   NOW, while the Buffer is in memory, and return that HTTPS URL.
 *   Instagram needs an HTTPS URL anyway, and Facebook can post a photo by URL.
 * → In dev we keep local file paths (fast + inspectable).
 *
 * Also (optionally) transforms images for Instagram if `igMode` field is present.
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { transformForInstagram, getImageMetadata } from '@/lib/image'
import { uploadToPublicHost } from '@/lib/upload'

const ON_VERCEL = !!process.env.VERCEL

// Dev only: local tmp dir for inspection. Prod uses a public host (see persist()).
const TMP_DIR = path.join(process.cwd(), '.data', 'tmp')

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

/**
 * Persist a buffer so it's reachable at publish time.
 * Prod → permanent public HTTPS URL (survives serverless invocations & cron).
 * Dev  → local file path.
 */
async function persist(buffer, fileName, contentType) {
  if (ON_VERCEL) {
    return await uploadToPublicHost(buffer, fileName)
  }
  ensureTmp()
  const p = path.join(TMP_DIR, fileName)
  fs.writeFileSync(p, buffer)
  return p
}

export async function POST(req) {
  try {
    const fd = await req.formData()
    const file = fd.get('file')
    const igMode = fd.get('igMode') // optional: 'square' | 'portrait' | 'landscape' | 'fit-square'

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const baseName = safeName(file.name || 'upload')
    const ext = path.extname(baseName) || '.jpg'
    const id = uuidv4().slice(0, 8)
    const isVideo = /^video\//.test(file.type) || /\.(mp4|mov|avi|webm)$/i.test(baseName)

    // 1. Original
    const origPath = await persist(buf, `${id}-${baseName}`, file.type)

    // 2. Optional: Instagram-cropped variant → separate reference
    let igPath = null
    let meta = null
    if (/^image\//.test(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(baseName)) {
      try { meta = await getImageMetadata(buf) } catch {}
      if (igMode) {
        const igBuf = await transformForInstagram(buf, igMode)
        igPath = await persist(igBuf, `${id}-ig-${path.basename(baseName, ext)}.jpg`, 'image/jpeg')
      }
    }

    return NextResponse.json({
      success: true,
      path: origPath,
      igPath,
      meta,
      isVideo,
    })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Allow larger uploads + time for the public-host upload
export const maxDuration = 60
