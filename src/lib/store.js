/**
 * Storage layer — multi-user, auto-switches between Vercel KV (production) and JSON file (dev).
 *
 * KV keys:
 *   sp:users          → users table (array)
 *   sp:db:<userId>    → per-user data { accounts, posts, post_results, comments, inbox_last_polled_at }
 *   sp:migrated       → flag: old sp:db has been migrated
 *
 * File (dev):
 *   .data/users.json
 *   .data/userdata_<userId>.json
 */

import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const DATA_DIR = path.join(process.cwd(), '.data')

function detectKvEnv() {
  const prefixes = ['KV', 'KV_REDIS', 'STORAGE', 'REDIS', 'UPSTASH']
  for (const p of prefixes) {
    const restUrl = process.env[`${p}_REST_API_URL`]
    const restToken = process.env[`${p}_REST_API_TOKEN`]
    const url = process.env[`${p}_URL`]
    if (restUrl && restToken) return { mode: 'rest', restUrl, restToken }
    if (url) return { mode: 'redis', url }
  }
  if (process.env.REDIS_URL) return { mode: 'redis', url: process.env.REDIS_URL }
  return null
}
const kvEnv = detectKvEnv()
const useKV = !!kvEnv

let _kvClient = null
async function getKvClient() {
  if (_kvClient) return _kvClient
  if (kvEnv.mode === 'rest') {
    const { Redis } = await import('@upstash/redis')
    const c = new Redis({ url: kvEnv.restUrl, token: kvEnv.restToken })
    _kvClient = {
      get: async (k) => c.get(k),
      set: async (k, v) => c.set(k, v),
    }
  } else {
    const { default: Redis } = await import('ioredis')
    const redis = new Redis(kvEnv.url, { lazyConnect: true, maxRetriesPerRequest: 3 })
    _kvClient = {
      get: async (k) => { const v = await redis.get(k); return v ? JSON.parse(v) : null },
      set: async (k, v) => redis.set(k, JSON.stringify(v)),
    }
  }
  return _kvClient
}

// ─── Generic KV / file helpers ────────────────────────────────────────────
async function kvGet(key) {
  if (useKV) {
    const kv = await getKvClient()
    const data = await kv.get(key)
    return typeof data === 'string' ? JSON.parse(data) : (data || null)
  }
  const file = path.join(DATA_DIR, key.replace(/:/g, '_').replace(/\//g, '_') + '.json')
  try {
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch { return null }
}

async function kvSet(key, value) {
  if (useKV) {
    const kv = await getKvClient()
    return kv.set(key, value)
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const file = path.join(DATA_DIR, key.replace(/:/g, '_').replace(/\//g, '_') + '.json')
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}

// ─── Users ────────────────────────────────────────────────────────────────
const USERS_KEY = 'sp:users'

async function loadUsers() {
  return (await kvGet(USERS_KEY)) || []
}

export async function getUsers() {
  return loadUsers()
}

export async function getUserById(id) {
  const users = await loadUsers()
  return users.find(u => u.id === id) || null
}

export async function getUserByEmail(email) {
  const users = await loadUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

export async function createUser({ email, passwordHash, isAdmin = false, aiEnabled = false }) {
  const users = await loadUsers()
  const id = uuidv4()
  const user = { id, email: email.toLowerCase(), passwordHash, isAdmin, aiEnabled, isActive: true, anthropicKey: null, monthlyPostQuota: null, createdAt: Math.floor(Date.now() / 1000) }
  users.push(user)
  await kvSet(USERS_KEY, users)
  return user
}

export async function updateUser(id, patch) {
  const users = await loadUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return null
  users[idx] = { ...users[idx], ...patch, id }
  await kvSet(USERS_KEY, users)
  return users[idx]
}

export async function deleteUser(id) {
  const users = await loadUsers()
  const filtered = users.filter(u => u.id !== id)
  if (filtered.length === users.length) return false
  await kvSet(USERS_KEY, filtered)
  return true
}

export async function deleteUserData(userId) {
  await kvSet(userDbKey(userId), null)
}

export async function checkMonthlyQuota(userId) {
  const user = await getUserById(userId)
  if (!user?.monthlyPostQuota) return { allowed: true, remaining: null, quota: null }
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0)
  const monthStart = Math.floor(firstOfMonth.getTime() / 1000)
  const posts = await getPosts(userId, 500)
  const count = posts.filter(p => p.created_at >= monthStart && ['published', 'partial', 'scheduled', 'publishing'].includes(p.status)).length
  return { allowed: count < user.monthlyPostQuota, count, quota: user.monthlyPostQuota, remaining: Math.max(0, user.monthlyPostQuota - count) }
}

// ─── Per-user data ────────────────────────────────────────────────────────
const EMPTY_DB = () => ({ accounts: [], posts: [], post_results: [], comments: [], inbox_last_polled_at: 0 })

function userDbKey(userId) { return `sp:db:${userId}` }

let _dbCache = {}
let _dbCacheTime = {}
const CACHE_MS = 100

async function loadUserDb(userId) {
  const now = Date.now()
  if (_dbCache[userId] && now - (_dbCacheTime[userId] || 0) < CACHE_MS) return _dbCache[userId]
  const data = await kvGet(userDbKey(userId))
  const db = data || EMPTY_DB()
  db.accounts = db.accounts || []
  db.posts = db.posts || []
  db.post_results = db.post_results || []
  db.comments = db.comments || []
  db.inbox_last_polled_at = db.inbox_last_polled_at || 0
  _dbCache[userId] = db
  _dbCacheTime[userId] = now
  return db
}

async function saveUserDb(userId, db) {
  _dbCache[userId] = db
  _dbCacheTime[userId] = Date.now()
  await kvSet(userDbKey(userId), db)
}

// ─── Migration from single-user ───────────────────────────────────────────
export async function migrateFromSingleUser(adminUserId) {
  const alreadyMigrated = await kvGet('sp:migrated')
  if (alreadyMigrated) return false
  // Try to load old single-user data
  const oldDb = await kvGet('sp:db')
  if (!oldDb) {
    // Check legacy file
    const legacyFile = path.join(DATA_DIR, 'social-poster-data.json')
    if (!fs.existsSync(legacyFile)) { await kvSet('sp:migrated', true); return false }
    try {
      const legacy = JSON.parse(fs.readFileSync(legacyFile, 'utf8'))
      if (!legacy || (!legacy.accounts?.length && !legacy.posts?.length)) {
        await kvSet('sp:migrated', true)
        return false
      }
      await saveUserDb(adminUserId, { ...EMPTY_DB(), ...legacy })
      await kvSet('sp:migrated', true)
      return true
    } catch { return false }
  }
  const db = typeof oldDb === 'string' ? JSON.parse(oldDb) : oldDb
  if (!db || (!db.accounts?.length && !db.posts?.length && !db.comments?.length)) {
    await kvSet('sp:migrated', true)
    return false
  }
  await saveUserDb(adminUserId, { ...EMPTY_DB(), ...db })
  await kvSet('sp:migrated', true)
  return true
}

export function isUsingKV() { return useKV }
export { kvGet, kvSet }

// ─── Mastodon per-instance app registration cache ────────────────────────
export async function getMastodonAppCache(instance) {
  return kvGet(`sp:mastodon:app:${instance}`)
}
export async function setMastodonAppCache(instance, data) {
  return kvSet(`sp:mastodon:app:${instance}`, data)
}
export async function getMastodonOAuthSession(stateId) {
  const d = await kvGet(`sp:mastodon:oauth:${stateId}`)
  if (!d || d.expiresAt < Math.floor(Date.now() / 1000)) return null
  return d
}
export async function setMastodonOAuthSession(stateId, data) {
  return kvSet(`sp:mastodon:oauth:${stateId}`, { ...data, expiresAt: Math.floor(Date.now() / 1000) + 1800 })
}

// ─── Password reset tokens ────────────────────────────────────────────────
export async function createResetToken(userId) {
  const { randomBytes } = await import('crypto')
  const token = randomBytes(32).toString('hex')
  await kvSet(`sp:reset:${token}`, { userId, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
  return token
}

export async function consumeResetToken(token) {
  const data = await kvGet(`sp:reset:${token}`)
  if (!data || data.expiresAt < Math.floor(Date.now() / 1000)) {
    if (data) await kvSet(`sp:reset:${token}`, null)
    return null
  }
  await kvSet(`sp:reset:${token}`, null)
  return data.userId
}

// ─── Invitations ──────────────────────────────────────────────────────────
const INVITES_KEY = 'sp:invites'
const INVITE_TTL = 7 * 24 * 60 * 60 // 7 days

async function loadInvites() {
  return (await kvGet(INVITES_KEY)) || []
}

export async function getInvites() {
  return loadInvites()
}

export async function createInvite(createdBy) {
  const { randomBytes } = await import('crypto')
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(10)
  const code = Array.from(bytes).map(b => chars[b % chars.length]).join('')
  const invite = {
    id: uuidv4(),
    code,
    createdBy,
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + INVITE_TTL,
    usedBy: null,
    usedAt: null,
  }
  const invites = await loadInvites()
  invites.push(invite)
  await kvSet(INVITES_KEY, invites)
  return invite
}

export async function getInviteByCode(code) {
  const invites = await loadInvites()
  return invites.find(i => i.code === code) || null
}

export async function useInvite(code, userId) {
  const invites = await loadInvites()
  const invite = invites.find(i => i.code === code)
  if (!invite) return false
  invite.usedBy = userId
  invite.usedAt = Math.floor(Date.now() / 1000)
  await kvSet(INVITES_KEY, invites)
  return true
}

// ─── Accounts ─────────────────────────────────────────────────────────────
export async function getAccounts(userId) {
  const db = await loadUserDb(userId)
  return [...db.accounts].sort((a, b) => a.platform.localeCompare(b.platform))
}

export async function getAccountsByPlatform(userId, platform) {
  const db = await loadUserDb(userId)
  return db.accounts.filter(a => a.platform === platform)
}

export async function saveAccount(userId, account) {
  const db = await loadUserDb(userId)
  const existing = db.accounts.find(a => a.platform === account.platform && a.platform_user_id === account.platform_user_id)
  if (existing) {
    Object.assign(existing, account, { updated_at: Math.floor(Date.now() / 1000) })
    await saveUserDb(userId, db)
    return existing.id
  }
  const id = uuidv4()
  db.accounts.push({ id, ...account, created_at: Math.floor(Date.now() / 1000) })
  await saveUserDb(userId, db)
  return id
}

export async function deleteAccount(userId, id) {
  const db = await loadUserDb(userId)
  db.accounts = db.accounts.filter(a => a.id !== id)
  await saveUserDb(userId, db)
}

// ─── Posts ────────────────────────────────────────────────────────────────
export async function createPost(userId, { content, mediaPaths, mediaPathsInstagram, platforms, scheduledAt, status }) {
  const db = await loadUserDb(userId)
  const id = uuidv4()
  db.posts.push({
    id, content,
    media_paths: mediaPaths || [],
    media_paths_instagram: mediaPathsInstagram || null,
    platforms,
    scheduled_at: scheduledAt || null,
    status: status || 'pending',
    created_at: Math.floor(Date.now() / 1000)
  })
  await saveUserDb(userId, db)
  return id
}

export async function getPosts(userId, limit = 100) {
  const db = await loadUserDb(userId)
  return db.posts.slice(-limit).reverse()
}

export async function getScheduledPosts(userId) {
  const db = await loadUserDb(userId)
  return db.posts.filter(p => p.status === 'scheduled')
}

export async function getDuePosts(userId) {
  const now = Math.floor(Date.now() / 1000)
  const db = await loadUserDb(userId)
  return db.posts.filter(p => p.status === 'scheduled' && p.scheduled_at && p.scheduled_at <= now)
}

export async function updatePostStatus(userId, id, status) {
  const db = await loadUserDb(userId)
  const p = db.posts.find(x => x.id === id)
  if (p) { p.status = status; await saveUserDb(userId, db) }
}

export async function cancelPost(userId, id) {
  return updatePostStatus(userId, id, 'cancelled')
}

// ─── Post results ─────────────────────────────────────────────────────────
export async function savePostResult(userId, { postId, platform, accountId, status, platformPostId, errorMessage }) {
  const db = await loadUserDb(userId)
  db.post_results.push({
    id: uuidv4(), post_id: postId, platform, account_id: accountId,
    status, platform_post_id: platformPostId || null,
    error_message: errorMessage || null,
    created_at: Math.floor(Date.now() / 1000)
  })
  await saveUserDb(userId, db)
}

export async function getPostResults(userId, postId) {
  const db = await loadUserDb(userId)
  return db.post_results.filter(r => r.post_id === postId)
}

// ─── Comments (Inbox) ─────────────────────────────────────────────────────
export async function getComments(userId, { status, limit = 200 } = {}) {
  const db = await loadUserDb(userId)
  let comments = [...db.comments]
  if (status) comments = comments.filter(c => c.status === status)
  comments.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  return comments.slice(0, limit)
}

export async function getPendingCommentsCount(userId) {
  const db = await loadUserDb(userId)
  return db.comments.filter(c => c.status === 'pending').length
}

export async function upsertComment(userId, comment) {
  const db = await loadUserDb(userId)
  const existing = db.comments.find(c => c.external_id === comment.external_id)
  if (existing) return null
  const id = uuidv4()
  db.comments.push({ id, status: 'pending', created_at: Math.floor(Date.now() / 1000), ...comment })
  await saveUserDb(userId, db)
  return id
}

export async function updateComment(userId, id, patch) {
  const db = await loadUserDb(userId)
  const c = db.comments.find(x => x.id === id)
  if (!c) return false
  Object.assign(c, patch, { updated_at: Math.floor(Date.now() / 1000) })
  await saveUserDb(userId, db)
  return true
}

export async function getComment(userId, id) {
  const db = await loadUserDb(userId)
  return db.comments.find(c => c.id === id) || null
}

export async function getInboxLastPolledAt(userId) {
  const db = await loadUserDb(userId)
  return db.inbox_last_polled_at || 0
}

export async function setInboxLastPolledAt(userId, timestamp) {
  const db = await loadUserDb(userId)
  db.inbox_last_polled_at = timestamp
  await saveUserDb(userId, db)
}
