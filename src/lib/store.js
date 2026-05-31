/**
 * Storage layer — auto-switches between Vercel KV (production) and JSON file (local dev).
 *
 * Detection: if KV_REST_API_URL env var is present, use Vercel KV; otherwise use file system.
 *
 * The DB shape: { accounts: [], posts: [], post_results: [] }
 * Stored under a single key 'sp:db' in KV, or in .data/social-poster-data.json on disk.
 */

import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const KV_KEY = 'sp:db'

const DATA_DIR  = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'social-poster-data.json')

// Detect a Redis connection URL from any common Vercel KV / Upstash prefix.
// Works with both REST API tokens AND plain Redis URLs.
function detectKvEnv() {
  const prefixes = ['KV', 'KV_REDIS', 'STORAGE', 'REDIS', 'UPSTASH']
  for (const p of prefixes) {
    const url = process.env[`${p}_URL`]
    const restUrl = process.env[`${p}_REST_API_URL`]
    const restToken = process.env[`${p}_REST_API_TOKEN`]
    if (restUrl && restToken) return { mode: 'rest', restUrl, restToken, url }
    if (url) return { mode: 'redis', url }
  }
  // Generic single-var fallback
  if (process.env.REDIS_URL) return { mode: 'redis', url: process.env.REDIS_URL }
  return null
}
const kvEnv = detectKvEnv()
const useKV = !!kvEnv

const EMPTY = { accounts: [], posts: [], post_results: [], comments: [] }

// ─── Internal cache to avoid hitting KV/disk for every operation in the same request
let _cache = null
let _cacheTime = 0
const CACHE_MS = 100

async function load() {
  if (_cache && Date.now() - _cacheTime < CACHE_MS) return _cache
  if (useKV) {
    const kv = await getKvClient()
    const data = await kv.get(KV_KEY)
    _cache = (typeof data === 'string') ? JSON.parse(data) : (data || { ...EMPTY })
  } else if (process.env.VERCEL) {
    // On Vercel without KV configured — log a clear error and return empty data
    console.error('[store] Vercel KV not detected. Env vars expected: KV_REST_API_URL+KV_REST_API_TOKEN (or KV_REDIS_*, STORAGE_*, REDIS_*, UPSTASH_*)')
    throw new Error('Stockage non configuré : connecte Vercel KV au projet et redéploie. (env vars *_REST_API_URL et *_REST_API_TOKEN manquantes)')
  } else {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
      if (!fs.existsSync(DATA_FILE)) _cache = { ...EMPTY }
      else {
        _cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      }
    } catch {
      _cache = { ...EMPTY }
    }
  }
  _cache.accounts     = _cache.accounts     || []
  _cache.posts        = _cache.posts        || []
  _cache.post_results = _cache.post_results || []
  _cache.comments     = _cache.comments     || []
  _cacheTime = Date.now()
  return _cache
}

// Lazy KV/Redis client. Tries REST API (Vercel KV / Upstash) first, falls back to ioredis.
let _kvClient = null
async function getKvClient() {
  if (_kvClient) return _kvClient
  if (kvEnv.mode === 'rest') {
    const { createClient } = await import('@vercel/kv')
    const c = createClient({ url: kvEnv.restUrl, token: kvEnv.restToken })
    _kvClient = {
      get: async (k) => c.get(k),
      set: async (k, v) => c.set(k, v),
    }
  } else {
    // Plain Redis URL (works with Upstash / any Redis)
    const { default: Redis } = await import('ioredis')
    const redis = new Redis(kvEnv.url, { lazyConnect: true, maxRetriesPerRequest: 3 })
    _kvClient = {
      get: async (k) => {
        const v = await redis.get(k)
        return v ? JSON.parse(v) : null
      },
      set: async (k, v) => redis.set(k, JSON.stringify(v)),
    }
  }
  return _kvClient
}

async function save(db) {
  _cache = db
  _cacheTime = Date.now()
  if (useKV) {
    const kv = await getKvClient()
    await kv.set(KV_KEY, db)
  } else {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8')
  }
}

// ─── Accounts ──
export async function getAccounts() {
  const db = await load()
  return [...db.accounts].sort((a, b) => a.platform.localeCompare(b.platform))
}

export async function getAccountsByPlatform(platform) {
  const db = await load()
  return db.accounts.filter(a => a.platform === platform)
}

export async function saveAccount(account) {
  const db = await load()
  const existing = db.accounts.find(a => a.platform === account.platform && a.platform_user_id === account.platform_user_id)
  if (existing) {
    Object.assign(existing, account, { updated_at: Math.floor(Date.now() / 1000) })
    await save(db)
    return existing.id
  }
  const id = uuidv4()
  db.accounts.push({ id, ...account, created_at: Math.floor(Date.now() / 1000) })
  await save(db)
  return id
}

export async function deleteAccount(id) {
  const db = await load()
  db.accounts = db.accounts.filter(a => a.id !== id)
  await save(db)
}

// ─── Posts ──
export async function createPost({ content, mediaPaths, mediaPathsInstagram, platforms, scheduledAt, status }) {
  const db = await load()
  const id = uuidv4()
  db.posts.push({
    id,
    content,
    media_paths: mediaPaths || [],
    media_paths_instagram: mediaPathsInstagram || null,
    platforms,
    scheduled_at: scheduledAt || null,
    status: status || 'pending',
    created_at: Math.floor(Date.now() / 1000)
  })
  await save(db)
  return id
}

export async function getPosts(limit = 100) {
  const db = await load()
  return db.posts.slice(-limit).reverse()
}

export async function getScheduledPosts() {
  const db = await load()
  return db.posts.filter(p => p.status === 'scheduled')
}

export async function getDuePosts() {
  const now = Math.floor(Date.now() / 1000)
  const db = await load()
  return db.posts.filter(p => p.status === 'scheduled' && p.scheduled_at && p.scheduled_at <= now)
}

export async function updatePostStatus(id, status) {
  const db = await load()
  const p = db.posts.find(x => x.id === id)
  if (p) { p.status = status; await save(db) }
}

export async function cancelPost(id) {
  return updatePostStatus(id, 'cancelled')
}

// ─── Post results ──
export async function savePostResult({ postId, platform, accountId, status, platformPostId, errorMessage }) {
  const db = await load()
  db.post_results.push({
    id: uuidv4(),
    post_id: postId,
    platform,
    account_id: accountId,
    status,
    platform_post_id: platformPostId || null,
    error_message: errorMessage || null,
    created_at: Math.floor(Date.now() / 1000)
  })
  await save(db)
}

export async function getPostResults(postId) {
  const db = await load()
  return db.post_results.filter(r => r.post_id === postId)
}

// ─── Comments (Inbox semi-auto) ──
export async function getComments({ status, limit = 200 } = {}) {
  const db = await load()
  let comments = [...db.comments]
  if (status) comments = comments.filter(c => c.status === status)
  // Newest first
  comments.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  return comments.slice(0, limit)
}

export async function getPendingCommentsCount() {
  const db = await load()
  return db.comments.filter(c => c.status === 'pending').length
}

/**
 * Crée OU met à jour un commentaire (upsert par externalId — l'ID natif Facebook).
 * Si l'externalId existe déjà, ignore (on ne re-traite pas les commentaires connus).
 * Sinon, crée avec status 'pending'.
 * @returns {string|null} ID interne du nouveau commentaire, ou null s'il existait déjà
 */
export async function upsertComment(comment) {
  const db = await load()
  const existing = db.comments.find(c => c.external_id === comment.external_id)
  if (existing) return null // already known — skip
  const id = uuidv4()
  db.comments.push({
    id,
    status: 'pending',
    created_at: Math.floor(Date.now() / 1000),
    ...comment,
  })
  await save(db)
  return id
}

export async function updateComment(id, patch) {
  const db = await load()
  const c = db.comments.find(x => x.id === id)
  if (!c) return false
  Object.assign(c, patch, { updated_at: Math.floor(Date.now() / 1000) })
  await save(db)
  return true
}

export async function getComment(id) {
  const db = await load()
  return db.comments.find(c => c.id === id) || null
}

export async function getInboxLastPolledAt() {
  const db = await load()
  return db.inbox_last_polled_at || 0
}

export async function setInboxLastPolledAt(timestamp) {
  const db = await load()
  db.inbox_last_polled_at = timestamp
  await save(db)
}

// For diagnostics
export function isUsingKV() { return useKV }
