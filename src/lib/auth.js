/**
 * Multi-user authentication.
 *
 * Users are stored in KV/file via store.js (sp:users key).
 * Passwords are hashed with scrypt (no external deps).
 * Session token format: userId.ts.hmac — signed with HMAC-SHA256.
 *
 * Migration: if sp:users is empty but APP_PASSWORD exists (legacy single-user),
 * the first login auto-creates the admin account and migrates data.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'sp_auth'
export const AUTH_COOKIE_NAME = COOKIE_NAME
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ─── Password hashing (scrypt, pure Node.js) ──────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPasswordHash(password, stored) {
  const colonIdx = stored.indexOf(':')
  if (colonIdx === -1) return false
  const salt = stored.slice(0, colonIdx)
  const hash = stored.slice(colonIdx + 1)
  try {
    const computed = crypto.scryptSync(password, salt, 64)
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), computed)
  } catch { return false }
}

// ─── Legacy single-user password (migration support) ─────────────────────
const DATA_DIR = path.join(process.cwd(), '.data')
const AUTH_FILE = path.join(DATA_DIR, 'auth.json')

export function getLegacyPassword() {
  if (process.env.APP_PASSWORD) return process.env.APP_PASSWORD
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'))
      return data.password || null
    }
  } catch {}
  return null
}

export function verifyLegacyPassword(input) {
  const expected = getLegacyPassword()
  if (!expected) return false
  try {
    const a = Buffer.from(String(input || ''))
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch { return false }
}

// ─── Session token ─────────────────────────────────────────────────────────
// Format: <userId>.<ts_base36>.<hmac32>
// userId is a UUID (no dots), ts is base-36 timestamp, hmac is 32-char hex

function getTokenSecret() {
  const base = process.env.TOKEN_SECRET || process.env.APP_PASSWORD || 'social-poster-dev-secret'
  return crypto.createHash('sha256').update('sp-session:' + base).digest()
}

export function createSessionToken(userId) {
  const secret = getTokenSecret()
  const ts = Date.now().toString(36)
  const payload = `${userId}.${ts}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
  return `${payload}.${hmac}`
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, ts, hmac] = parts
  if (!userId || !ts || !hmac) return null
  const secret = getTokenSecret()
  const payload = `${userId}.${ts}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
  try {
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return null
  } catch { return null }
  const tsMs = parseInt(ts, 36)
  if (isNaN(tsMs) || Date.now() - tsMs > AUTH_COOKIE_MAX_AGE * 1000) return null
  return userId
}

// ─── Cookie helper ─────────────────────────────────────────────────────────
export function setAuthCookie(res, token) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  })
}

// ─── API route helpers ────────────────────────────────────────────────────
// requireAuth  — fast (no DB read), returns { userId } or NextResponse 401
// requireUser  — also loads user from DB, checks isActive, returns { userId, user }

export function requireAuth(req) {
  const cookie = req.cookies.get(COOKIE_NAME)
  if (!cookie?.value) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = verifySessionToken(cookie.value)
  if (!userId) {
    return NextResponse.json({ error: 'Session expirée — reconnecte-toi' }, { status: 401 })
  }
  return { userId }
}

export async function requireUser(req) {
  const cookieAuth = requireAuth(req)
  if (cookieAuth instanceof NextResponse) return cookieAuth
  const { getUserById } = await import('@/lib/store')
  const user = await getUserById(cookieAuth.userId)
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (user.isActive === false) {
    return NextResponse.json({ error: 'Compte désactivé — contacte l\'administrateur' }, { status: 403 })
  }
  return { userId: user.id, user }
}
