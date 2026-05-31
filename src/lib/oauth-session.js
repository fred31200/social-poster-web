/**
 * Temporary in-memory store for OAuth flows that need a second step
 * (e.g. Meta: after OAuth we get a list of pages, user picks one before account is saved).
 *
 * In-memory is fine for a single-user solo app. For multi-user we'd use Vercel KV.
 */

const pendingMetaPages = new Map()
const TTL_MS = 30 * 60 * 1000 // 30 minutes

export function stashMetaSession(data) {
  // Random session id
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  pendingMetaPages.set(id, { ...data, expiresAt: Date.now() + TTL_MS })
  return id
}

export function getMetaSession(id) {
  const entry = pendingMetaPages.get(id)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) { pendingMetaPages.delete(id); return null }
  return entry
}

export function clearMetaSession(id) {
  pendingMetaPages.delete(id)
}
