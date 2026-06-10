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
    postingSlots: Array.isArray(user.postingSlots) ? user.postingSlots : [],
    signature: user.signature || '',
    voiceProfile: user.voiceProfile || null,
    voiceSurveyDone: !!user.voiceSurveyDone,
  })
}

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { anthropicKey, postingSlots, signature, voiceProfile, voiceSurveyDone } = await req.json()
    const patch = {}
    if (typeof signature === 'string') patch.signature = signature.slice(0, 300)
    if (typeof voiceSurveyDone === 'boolean') patch.voiceSurveyDone = voiceSurveyDone
    if (voiceProfile && typeof voiceProfile === 'object') {
      // Enquête de style : champs texte whitelisted et bornés
      const pick = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
      patch.voiceProfile = {
        activity: pick(voiceProfile.activity, 200),
        tone: pick(voiceProfile.tone, 200),
        address: voiceProfile.address === 'vous' ? 'vous' : 'tu',
        emojis: ['aucun', 'peu', 'beaucoup'].includes(voiceProfile.emojis) ? voiceProfile.emojis : 'peu',
        themes: pick(voiceProfile.themes, 300),
        sample: pick(voiceProfile.sample, 2000),
      }
    }
    if (Array.isArray(postingSlots)) {
      // Créneaux de publication : [{ day: 0-6, time: 'HH:MM' }]
      patch.postingSlots = postingSlots
        .filter(s => s && Number.isInteger(s.day) && s.day >= 0 && s.day <= 6 && /^\d{2}:\d{2}$/.test(s.time || ''))
        .slice(0, 28)
    }
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
