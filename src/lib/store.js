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

// Detect Vercel KV / Upstash with either KV_* or STORAGE_* prefix
const useKV = !!(process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL)

const EMPTY = { accounts: [], posts: [], post_results: [] }

// ─── Internal cache to avoid hitting KV/disk for every operation in the same request
let _cache = null
let _cacheTime = 0
const CACHE_MS = 100

async function load() {
  if (_cache && Date.now() - _cacheTime < CACHE_MS) return _cache
  if (useKV) {
    // Map STORAGE_* env vars to KV_* if needed (Vercel uses custom prefix)
    if (process.env.STORAGE_REST_API_URL && !process.env.KV_REST_API_URL) {
      process.env.KV_REST_API_URL = process.env.STORAGE_REST_API_URL
      process.env.KV_REST_API_TOKEN = process.env.STORAGE_REST_API_TOKEN
      process.env.KV_URL = process.env.STORAGE_URL
    }
    const { kv } = await import('@vercel/kv')
    const data = await kv.get(KV_KEY)
    _cache = data || { ...EMPTY }
  } else {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(DATA_FILE)) _cache = { ...EMPTY }
    else {
      try { _cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }
      catch { _cache = { ...EMPTY } }
    }
  }
  _cache.accounts     = _cache.accounts     || []
  _cache.posts        = _cache.posts        || []
  _cache.post_results = _cache.post_results || []
  _cacheTime = Date.now()
  return _cache
}

async function save(db) {
  _cache = db
  _cacheTime = Date.now()
  if (useKV) {
    // Map STORAGE_* env vars to KV_* if needed (Vercel uses custom prefix)
    if (process.env.STORAGE_REST_API_URL && !process.env.KV_REST_API_URL) {
      process.env.KV_REST_API_URL = process.env.STORAGE_REST_API_URL
      process.env.KV_REST_API_TOKEN = process.env.STORAGE_REST_API_TOKEN
      process.env.KV_URL = process.env.STORAGE_URL
    }
    const { kv } = await import('@vercel/kv')
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

// For diagnostics
export function isUsingKV() { return useKV }
