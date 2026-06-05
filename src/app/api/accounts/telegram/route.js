import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { saveAccount } from '@/lib/store'
import { getTelegramChatInfo } from '@/lib/social/telegram'

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { botToken, chatId } = await req.json()
    if (!botToken || !chatId) return NextResponse.json({ error: 'Bot token et Chat ID requis' }, { status: 400 })

    const chat = await getTelegramChatInfo(botToken.trim(), chatId.trim())
    const name = chat.title || chat.username || chatId
    const id = await saveAccount(auth.userId, {
      platform: 'telegram',
      name,
      platform_user_id: String(chat.id),
      page_id: chatId.trim(),
      access_token: botToken.trim(),
      avatar: null,
    })
    return NextResponse.json({ success: true, id, name })
  } catch (err) {
    const msg = err?.response?.data?.description || err.message
    return NextResponse.json({ error: `Connexion Telegram échouée : ${msg}` }, { status: 400 })
  }
}
