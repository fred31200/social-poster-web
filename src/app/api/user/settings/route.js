import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { updateUser } from '@/lib/store'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { user } = auth
  return NextResponse.json({
    anthropicKey: user.anthropicKey ? '***' + user.anthropicKey.slice(-4) : null,
    hasOwnKey: !!user.anthropicKey,
    aiEnabled: user.aiEnabled,
  })
}

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { anthropicKey } = await req.json()
    const patch = {}
    if (anthropicKey === '') {
      patch.anthropicKey = null
    } else if (anthropicKey && anthropicKey.startsWith('sk-ant-')) {
      patch.anthropicKey = anthropicKey.trim()
    } else if (anthropicKey) {
      return NextResponse.json({ error: 'Clé Anthropic invalide (doit commencer par sk-ant-)' }, { status: 400 })
    }
    await updateUser(auth.userId, patch)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
