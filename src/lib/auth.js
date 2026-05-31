/**
 * Simple single-user authentication.
 *
 * The password comes from APP_PASSWORD env var (production) or .data/auth.json (dev).
 * On login, we set an httpOnly cookie containing a signed HMAC token.
 * The token is just `userId.timestamp.hmac` — no database, no JWT lib needed.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR  = path.join(process.cwd(), '.data')
const AUTH_FILE = path.join(DATA_DIR, 'auth.json')
const COOKIE_NAME = 'sp_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ─── Configuration ─────────────────────────────────────────────────────────
// In production (Vercel), the APP_PASSWORD env var is REQUIRED — there's no setup flow
// because the filesystem is read-only and we don't want to write the password into KV
// (which would be visible in plaintext to anyone with KV access).
// In dev: env var > .data/auth.json > null (open mode).
export function getAppPassword() {
  if (process.env.APP_PASSWORD) return process.env.APP_PASSWORD
  if (process.env.VERCEL) return null // production without env var = open mode (not recommended)
  ensureDir()
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'))
      return data.password || null
    } catch { return null }
  }
  return null
}

export function setAppPassword(password) {
  // Only writes locally — in production, password must be set via Vercel env vars
  if (process.env.VERCEL) throw new Error('En production, le mot de passe doit être configuré via la variable d\'env APP_PASSWORD sur Vercel.')
  ensureDir()
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ password }, null, 2), 'utf8')
}

export function isAuthConfigured() {
  return getAppPassword() !== null
}

// ─── Session token (HMAC-signed) ───────────────────────────────────────────
function getSecret() {
  // Derive a stable secret from the password itself (since password is required to access)
  const password = getAppPassword()
  if (!password) return null
  return crypto.createHash('sha256').update('social-poster-secret:' + password).digest()
}

function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function verifyPassword(input) {
  const expected = getAppPassword()
  if (!expected) return false
  return timingSafeEqualString(String(input || ''), expected)
}

export function createSessionToken() {
  const secret = getSecret()
  if (!secret) return null
  const ts = Date.now().toString(36)
  const hmac = crypto.createHmac('sha256', secret).update(ts).digest('hex').slice(0, 32)
  return `${ts}.${hmac}`
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false
  const secret = getSecret()
  if (!secret) return false
  const [ts, hmac] = token.split('.')
  if (!ts || !hmac) return false
  const expected = crypto.createHmac('sha256', secret).update(ts).digest('hex').slice(0, 32)
  if (!timingSafeEqualString(hmac, expected)) return false
  // Optional expiration check (30 days)
  const tsMs = parseInt(ts, 36)
  if (isNaN(tsMs)) return false
  if (Date.now() - tsMs > COOKIE_MAX_AGE * 1000) return false
  return true
}

export const AUTH_COOKIE_NAME = COOKIE_NAME
export const AUTH_COOKIE_MAX_AGE = COOKIE_MAX_AGE

// ─── Helper for API routes ─────────────────────────────────────────────────
// Returns null if authenticated, or a NextResponse 401 to return early
import { NextResponse } from 'next/server'

export function requireAuth(req) {
  // If no password configured, app is "open" — let everyone in
  if (!isAuthConfigured()) return null
  const cookie = req.cookies.get(COOKIE_NAME)
  if (cookie && verifySessionToken(cookie.value)) return null
  return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
}
