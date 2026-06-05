/**
 * KV-based rate limiter for API routes.
 * Uses a sliding window per IP.
 */

import { kvGet, kvSet, isUsingKV } from './store'

const _memStore = new Map() // dev fallback

async function rlGet(key) {
  if (isUsingKV()) return (await kvGet(key)) || null
  return _memStore.get(key) || null
}

async function rlSet(key, value) {
  if (isUsingKV()) return kvSet(key, value)
  _memStore.set(key, value)
}

/**
 * Check and increment rate limit for a given key.
 * @param {string} identifier — IP address or user id
 * @param {object} opts
 * @param {number} opts.max — max attempts per window (default: 10)
 * @param {number} opts.windowMs — window in ms (default: 15 min)
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export async function rateLimit(identifier, { max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const key = `sp:rl:${identifier}`
  const now = Date.now()
  let entry = await rlGet(key)

  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + windowMs }
    await rlSet(key, entry)
    return { allowed: true, remaining: max - 1, resetAt: entry.resetAt }
  }

  entry.count++
  await rlSet(key, entry)

  const remaining = Math.max(0, max - entry.count)
  return { allowed: entry.count <= max, remaining, resetAt: entry.resetAt }
}

export function getClientIp(req) {
  const xff = req.headers.get('x-forwarded-for')
  return (xff ? xff.split(',')[0] : '').trim() || 'unknown'
}
