/**
 * OAuth session store — uses KV in production (Vercel), in-memory fallback in dev.
 * Prevents losing Meta page-selection sessions on Vercel cold starts.
 */

import { kvGet, kvSet, isUsingKV } from './store'

const TTL_MS = 30 * 60 * 1000 // 30 minutes
const _memStore = new Map() // dev fallback

function sessionKey(id) { return `sp:oauth:${id}` }

export async function stashMetaSession(data) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const entry = { ...data, expiresAt: Date.now() + TTL_MS }
  if (isUsingKV()) {
    await kvSet(sessionKey(id), entry)
  } else {
    _memStore.set(id, entry)
  }
  return id
}

export async function getMetaSession(id) {
  let entry
  if (isUsingKV()) {
    entry = await kvGet(sessionKey(id))
  } else {
    entry = _memStore.get(id) || null
  }
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    clearMetaSession(id)
    return null
  }
  return entry
}

export function clearMetaSession(id) {
  if (isUsingKV()) {
    kvSet(sessionKey(id), null).catch(() => {})
  } else {
    _memStore.delete(id)
  }
}
