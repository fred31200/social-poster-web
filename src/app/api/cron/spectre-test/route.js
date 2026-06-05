/**
 * TEMPORARY end-to-end test harness for the multi-user system.
 * Under /api/cron/* (middleware passthrough), gated by a dedicated token.
 *
 * GET                      → full self-contained logic test (creates a fake
 *                            invite + invitee @spectre.test, checks everything,
 *                            then PURGES all test artifacts). Returns a report.
 * GET  ?action=make-invite → create + return a fresh invite code (for the HTTP test).
 * POST ?action=cleanup     → purge any leftover test artifacts (@spectre.test users
 *                            + invites created by the harness). Idempotent.
 *
 * Test data only — never touches real users or sp:db. ⚠️ Remove after testing.
 */

import { NextResponse } from 'next/server'
import {
  getUsers, getUserByEmail, createUser, deleteUser, deleteUserData,
  createInvite, getInviteByCode, useInvite, getAccounts, kvGet, kvSet,
} from '@/lib/store'
import { hashPassword, verifyPasswordHash, createSessionToken, verifySessionToken } from '@/lib/auth'

const TOKEN = 'spectre_K7n2Qx9Lp4Rv8Wt6Zb1Yc3Hd5Fg0Mj'

function authorized(req) {
  const url = new URL(req.url)
  const t = url.searchParams.get('t') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  return t === TOKEN
}

function asObj(v) { if (!v) return null; return typeof v === 'string' ? (() => { try { return JSON.parse(v) } catch { return null } })() : v }

async function purgeTestArtifacts() {
  const users = await getUsers()
  let removedUsers = 0
  for (const u of users) {
    if (/@spectre\.test$/i.test(u.email || '')) { await deleteUser(u.id); await deleteUserData(u.id); removedUsers++ }
  }
  const raw = await kvGet('sp:invites')
  const invites = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : [])
  const keep = invites.filter(i => !String(i.createdBy || '').startsWith('spectre'))
  if (keep.length !== invites.length) await kvSet('sp:invites', keep)
  return { removedUsers, removedInvites: invites.length - keep.length }
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const url = new URL(req.url)

  if (url.searchParams.get('action') === 'make-invite') {
    const inv = await createInvite('spectre-http')
    return NextResponse.json({ ok: true, code: inv.code, expiresAt: inv.expiresAt })
  }

  const results = []
  const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail ?? '' })
  const now = Math.floor(Date.now() / 1000)
  const before = (await getUsers()).length

  try {
    // ── Invitations ──
    const invite = await createInvite('spectre-logic')
    check('Invitation générée par l’admin', invite?.code, invite?.code)
    const fetched = await getInviteByCode(invite.code)
    check('Invitation valide (non utilisée, non expirée)', fetched && !fetched.usedBy && fetched.expiresAt > now)
    check('Code d’invitation bidon rejeté', !(await getInviteByCode('zzz-not-a-real-code')))

    // ── Inscription de l’invité ──
    const email = `spectre-${Date.now()}@spectre.test`
    check('Email disponible avant inscription', !(await getUserByEmail(email)))
    const invitee = await createUser({ email, passwordHash: hashPassword('Sp3ctre!Pass'), isAdmin: false, aiEnabled: false })
    await useInvite(invite.code, invitee.id)
    check('Invité inscrit (non-admin, actif)', invitee?.id && invitee.isAdmin === false && invitee.isActive === true)
    check('Invité SANS IA par défaut (coûts maîtrisés)', invitee.aiEnabled === false)

    // ── Invitation à usage unique ──
    const used = await getInviteByCode(invite.code)
    check('Invitation marquée « utilisée »', used?.usedBy === invitee.id)
    check('Réutilisation de l’invitation impossible', !!used?.usedBy)

    // ── Mots de passe & sessions ──
    check('Mot de passe correct accepté / mauvais refusé',
      verifyPasswordHash('Sp3ctre!Pass', invitee.passwordHash) && !verifyPasswordHash('mauvais', invitee.passwordHash))
    const tok = createSessionToken(invitee.id)
    check('Session valide → bon utilisateur', verifySessionToken(tok) === invitee.id)
    check('Session falsifiée rejetée', verifySessionToken(tok.slice(0, -3) + 'aaa') !== invitee.id)

    // ── Isolation des données ──
    const accs = await getAccounts(invitee.id)
    check('Invité démarre avec un espace VIERGE (0 réseau)', accs.length === 0)
    const adminDb = asObj(await kvGet('sp:db'))
    check('Tes vraies données admin restent intactes',
      (adminDb?.accounts?.length || 0) >= 4 && (adminDb?.posts?.length || 0) >= 11,
      `réseaux=${adminDb?.accounts?.length || 0}, posts=${adminDb?.posts?.length || 0}`)
    check('Données stockées sous des clés séparées par utilisateur', `sp:db:${invitee.id}` !== 'sp:db')
  } catch (e) {
    check('Exception inattendue', false, String(e?.message || e))
  } finally {
    const purge = await purgeTestArtifacts()
    check('Purge des données de test (aucune trace laissée)', true, `users=${purge.removedUsers}, invites=${purge.removedInvites}`)
  }

  const after = (await getUsers()).length
  check('Nombre de comptes revenu à l’état initial', after === before, `avant=${before}, après=${after}`)

  const passed = results.filter(r => r.pass).length
  return NextResponse.json({ ok: passed === results.length, summary: `${passed}/${results.length}`, before, after, results })
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (new URL(req.url).searchParams.get('action') === 'cleanup') {
    return NextResponse.json({ ok: true, purged: await purgeTestArtifacts() })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
