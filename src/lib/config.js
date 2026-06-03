/**
 * App config (Meta/LinkedIn/Threads/TikTok credentials).
 * In local dev: stored in .data/config.json
 * In production: should come from environment variables (Phase 6)
 */

import fs from 'fs'
import path from 'path'

const DATA_DIR    = path.join(process.cwd(), '.data')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

function ensureDir() {
  // Skip on Vercel (read-only filesystem, file storage isn't used in prod anyway)
  if (process.env.VERCEL) return
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch {}
}

const DEFAULT_CONFIG = {
  meta_app_id:        '',
  meta_app_secret:    '',
  linkedin_client_id:     '',
  linkedin_client_secret: '',
  threads_app_id:     '',
  threads_app_secret: '',
  tiktok_client_key:    '',
  tiktok_client_secret: '',
  pinterest_app_id:    '',
  pinterest_app_secret: '',
  gemini_api_key:      '',
}

export function getConfig() {
  // Wrap everything defensively — config reads must never throw
  let fromFile = {}
  try {
    ensureDir()
    if (fs.existsSync(CONFIG_FILE)) {
      fromFile = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    }
  } catch (e) {
    console.error('[config] file read error (non-fatal):', e?.message)
  }
  return {
    ...DEFAULT_CONFIG,
    ...fromFile,
    // Env-var overrides (production-friendly)
    meta_app_id:            process.env.META_APP_ID            || fromFile.meta_app_id            || '',
    meta_app_secret:        process.env.META_APP_SECRET        || fromFile.meta_app_secret        || '',
    linkedin_client_id:     process.env.LINKEDIN_CLIENT_ID     || fromFile.linkedin_client_id     || '',
    linkedin_client_secret: process.env.LINKEDIN_CLIENT_SECRET || fromFile.linkedin_client_secret || '',
    threads_app_id:         process.env.THREADS_APP_ID         || fromFile.threads_app_id         || '',
    threads_app_secret:     process.env.THREADS_APP_SECRET     || fromFile.threads_app_secret     || '',
    tiktok_client_key:      process.env.TIKTOK_CLIENT_KEY      || fromFile.tiktok_client_key      || '',
    tiktok_client_secret:   process.env.TIKTOK_CLIENT_SECRET   || fromFile.tiktok_client_secret   || '',
    pinterest_app_id:       process.env.PINTEREST_APP_ID       || fromFile.pinterest_app_id       || '',
    pinterest_app_secret:   process.env.PINTEREST_APP_SECRET   || fromFile.pinterest_app_secret   || '',
    gemini_api_key:         process.env.GEMINI_API_KEY         || fromFile.gemini_api_key         || '',
  }
}

export function saveConfig(updates) {
  if (process.env.VERCEL) {
    throw new Error('En production, configure les credentials via les variables d\'env Vercel (META_APP_ID, META_APP_SECRET, etc.) — pas via cette interface.')
  }
  ensureDir()
  const current = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {}
  const merged = { ...current, ...updates }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8')
  return getConfig()
}

// Redirect URI for OAuth — derived from request host in production, hardcoded in dev
export function getRedirectUri(req) {
  if (process.env.OAUTH_REDIRECT_URI) return process.env.OAUTH_REDIRECT_URI
  // Build from request headers
  if (req?.headers) {
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host  = req.headers.get('host') || 'localhost:3000'
    return `${proto}://${host}/api/oauth/callback`
  }
  return 'http://localhost:3000/api/oauth/callback'
}
