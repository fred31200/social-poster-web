import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getConfig, getRedirectUri } from '@/lib/config'
import { buildMetaOAuthURL } from '@/lib/social/meta'
import { buildLinkedInOAuthURL } from '@/lib/social/linkedin'
import { buildThreadsOAuthURL } from '@/lib/social/threads'
import { buildTikTokOAuthURL } from '@/lib/social/tiktok'
import { buildPinterestOAuthURL } from '@/lib/social/pinterest'
import { buildMastodonOAuthURL, registerMastodonApp } from '@/lib/social/mastodon'
import { getMastodonAppCache, setMastodonAppCache, setMastodonOAuthSession } from '@/lib/store'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { platform, instanceUrl } = await req.json()
  const config = getConfig()
  const redirectUri = getRedirectUri(req)
  let url = null

  if (platform === 'meta' || platform === 'instagram') {
    if (!config.meta_app_id) return NextResponse.json({ error: 'Meta App ID manquant' }, { status: 400 })
    url = buildMetaOAuthURL({ clientId: config.meta_app_id, redirectUri, state: `${platform}:${userId}` })
  } else if (platform === 'linkedin') {
    if (!config.linkedin_client_id) return NextResponse.json({ error: 'LinkedIn Client ID manquant' }, { status: 400 })
    url = buildLinkedInOAuthURL({ clientId: config.linkedin_client_id, redirectUri, state: `linkedin:${userId}` })
  } else if (platform === 'threads') {
    if (!config.threads_app_id) return NextResponse.json({ error: 'Threads App ID manquant' }, { status: 400 })
    url = buildThreadsOAuthURL({ clientId: config.threads_app_id, redirectUri, state: `threads:${userId}` })
  } else if (platform === 'tiktok') {
    if (!config.tiktok_client_key) return NextResponse.json({ error: 'TikTok Client Key manquant' }, { status: 400 })
    url = buildTikTokOAuthURL({ clientKey: config.tiktok_client_key, redirectUri, state: `tiktok:${userId}` })
  } else if (platform === 'pinterest') {
    if (!config.pinterest_app_id) return NextResponse.json({ error: 'Pinterest App ID manquant — configure-le dans Comptes > Pinterest' }, { status: 400 })
    url = buildPinterestOAuthURL({ clientId: config.pinterest_app_id, redirectUri, state: `pinterest:${userId}` })
  } else if (platform === 'mastodon') {
    if (!instanceUrl) return NextResponse.json({ error: 'URL de l\'instance Mastodon requise' }, { status: 400 })
    const instance = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
    let appCreds = await getMastodonAppCache(instance)
    if (!appCreds) {
      try {
        appCreds = await registerMastodonApp(instance)
        await setMastodonAppCache(instance, appCreds)
      } catch (e) {
        return NextResponse.json({ error: `Impossible de contacter ${instance} — vérifie l'URL` }, { status: 400 })
      }
    }
    const stateId = uuidv4().slice(0, 8)
    await setMastodonOAuthSession(stateId, { userId, instance, client_id: appCreds.client_id, client_secret: appCreds.client_secret })
    url = buildMastodonOAuthURL({ instance, clientId: appCreds.client_id, redirectUri, state: `mastodon:${stateId}` })
  } else {
    return NextResponse.json({ error: 'Plateforme non supportée: ' + platform }, { status: 400 })
  }

  return NextResponse.json({ success: true, url })
}
