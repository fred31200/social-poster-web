import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getUserById, updateUser, deleteUser, deleteUserData } from '@/lib/store'
import { logAudit } from '@/lib/audit'

async function checkAdmin(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return { error: auth }
  if (!auth.user.isAdmin) return { error: NextResponse.json({ error: 'Accès admin requis' }, { status: 403 }) }
  return auth
}

// PATCH — toggle isActive or aiEnabled
export async function PATCH(req, { params }) {
  const check = await checkAdmin(req)
  if (check.error) return check.error
  const { id } = await params
  if (id === check.userId) return NextResponse.json({ error: 'Impossible de modifier ton propre compte ici' }, { status: 400 })
  const target = await getUserById(id)
  if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  const patch = await req.json()
  const allowed = {}
  if (typeof patch.isActive === 'boolean') allowed.isActive = patch.isActive
  if (typeof patch.aiEnabled === 'boolean') allowed.aiEnabled = patch.aiEnabled
  if (typeof patch.monthlyPostQuota === 'number' || patch.monthlyPostQuota === null) allowed.monthlyPostQuota = patch.monthlyPostQuota
  const updated = await updateUser(id, allowed)
  if ('isActive' in allowed) logAudit(check.userId, allowed.isActive ? 'user.enabled' : 'user.disabled', { targetId: id, email: target.email })
  return NextResponse.json({ success: true, user: { id: updated.id, email: updated.email, isActive: updated.isActive !== false, aiEnabled: updated.aiEnabled, monthlyPostQuota: updated.monthlyPostQuota ?? null } })
}

// DELETE — remove user + all their data
export async function DELETE(req, { params }) {
  const check = await checkAdmin(req)
  if (check.error) return check.error
  const { id } = await params
  if (id === check.userId) return NextResponse.json({ error: 'Impossible de supprimer ton propre compte' }, { status: 400 })
  const target = await getUserById(id)
  const ok = await deleteUser(id)
  if (!ok) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  await deleteUserData(id)
  logAudit(check.userId, 'user.deleted', { targetId: id, email: target?.email })
  return NextResponse.json({ success: true })
}
