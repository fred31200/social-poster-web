/**
 * Audit log — stores key actions in KV (capped at 500 entries).
 * Fire-and-forget: errors are swallowed to never block the main flow.
 *
 * Actions: login, post.published, account.connected, account.removed,
 *          user.created, user.disabled, user.enabled, user.deleted,
 *          invite.created, password.changed
 */

import { kvGet, kvSet } from './store'

const AUDIT_KEY = 'sp:audit'
const MAX_ENTRIES = 500

export async function logAudit(userId, action, metadata = {}) {
  try {
    const entries = (await kvGet(AUDIT_KEY)) || []
    entries.unshift({
      ts: Math.floor(Date.now() / 1000),
      userId,
      action,
      ...metadata,
    })
    if (entries.length > MAX_ENTRIES) entries.splice(MAX_ENTRIES)
    await kvSet(AUDIT_KEY, entries)
  } catch (e) {
    console.error('[audit]', e?.message)
  }
}

export async function getAuditLog({ limit = 100, userId } = {}) {
  const entries = (await kvGet(AUDIT_KEY)) || []
  const filtered = userId ? entries.filter(e => e.userId === userId) : entries
  return filtered.slice(0, limit)
}
