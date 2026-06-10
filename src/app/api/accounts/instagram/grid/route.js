/** Renvoie les 9 derniers médias Instagram (aperçu grille façon Later). */
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getAccountsByPlatform } from '@/lib/store'
import axios from 'axios'

export const maxDuration = 30

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const accounts = await getAccountsByPlatform(auth.userId, 'instagram')
  const account = accounts[0]
  if (!account?.instagram_account_id) return NextResponse.json({ media: [] })
  try {
    const r = await axios.get(`https://graph.facebook.com/v19.0/${account.instagram_account_id}/media`, {
      params: {
        fields: 'id,media_url,thumbnail_url,permalink,media_type',
        limit: 9,
        access_token: account.access_token,
      },
    })
    const media = (r.data.data || []).map(m => ({ id: m.id, url: m.thumbnail_url || m.media_url, permalink: m.permalink }))
    return NextResponse.json({ media })
  } catch (e) {
    return NextResponse.json({ media: [], error: e?.response?.data?.error?.message || e.message })
  }
}
