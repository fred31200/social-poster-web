/**
 * TEMPORARY maintenance endpoint — diagnose & reset the multi-user overlay in KV.
 * Protected by CRON_SECRET (query ?secret= or Authorization: Bearer <secret>).
 *
 * GET  → read-only snapshot of users / migrated flag / legacy sp:db / per-user data.
 * POST { action: 'reset-multiuser' } → delete ONLY the multi-user overlay
 *        (sp:users, sp:migrated, sp:db:<userId>). NEVER touches sp:db (real data).
 *
 * ⚠️ Remove this route before going to production.
 */

import { NextResponse } from 'next/server'
import { getUsers, kvGet, kvSet } from '@/lib/store'

function authorized(req) {
  const url = new URL(req.url)
  const fromQuery = url.searchParams.get('secret')
  const fromHeader = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const secret = fromQuery || fromHeader
  return !!secret && !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET
}

function asObj(v) {
  if (!v) return null
  return typeof v === 'string' ? (() => { try { return JSON.parse(v) } catch { return null } })() : v
}

async function snapshot() {
  const users = await getUsers()
  const migrated = await kvGet('sp:migrated')
  const oldDb = asObj(await kvGet('sp:db'))
  const perUser = []
  for (const u of users) {
    const d = asObj(await kvGet(`sp:db:${u.id}`))
    perUser.push({
      id: u.id,
      email: u.email,
      isAdmin: !!u.isAdmin,
      accounts: d?.accounts?.length || 0,
      posts: d?.posts?.length || 0,
    })
  }
  return {
    userCount: users.length,
    migratedFlag: !!migrated,
    legacySingleUserDb: {
      exists: !!oldDb,
      accounts: oldDb?.accounts?.length || 0,
      posts: oldDb?.posts?.length || 0,
      accountPlatforms: (oldDb?.accounts || []).map(a => a.platform),
    },
    users: perUser,
  }
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json({ ok: true, state: await snapshot() })
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  if (body.action !== 'reset-multiuser') {
    return NextResponse.json({ error: 'unknown action (expected reset-multiuser)' }, { status: 400 })
  }
  const before = await snapshot()
  // Delete ONLY the multi-user overlay. sp:db (real single-user data) is left intact.
  const users = await getUsers()
  for (const u of users) await kvSet(`sp:db:${u.id}`, null)
  await kvSet('sp:users', null)
  await kvSet('sp:migrated', null)
  const after = await snapshot()
  return NextResponse.json({ ok: true, reset: true, deletedUserDbs: users.length, before, after })
}
