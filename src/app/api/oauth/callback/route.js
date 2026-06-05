/**
 * OAuth callback — receives ?code=...&state=platform:userId (or mastodon:stateId)
 */

import { NextResponse } from 'next/server'
import { getConfig, getRedirectUri } from '@/lib/config'
import { exchangeMetaCode, getUserPagesAndInstagram } from '@/lib/social/meta'
import { exchangeLinkedInCode, getLinkedInProfile } from '@/lib/social/linkedin'
import { exchangeThreadsCode, getThreadsUserInfo } from '@/lib/social/threads'
import { exchangeTikTokCode, getTikTokUserInfo } from '@/lib/social/tiktok'
import { exchangePinterestCode, getPinterestProfile } from '@/lib/social/pinterest'
import { exchangeMastodonCode, getMastodonProfile } from '@/lib/social/mastodon'
import { saveAccount, getMastodonOAuthSession } from '@/lib/store'
import { stashMetaSession } from '@/lib/oauth-session'

function parseState(state) {
  if (!state) return { platform: null, userId: null, extra: null }
  const parts = state.split(':')
  return { platform: parts[0], userId: parts[1] || null, extra: parts.slice(2).join(':') || null }
}

export async function GET(req) {
  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error') || url.searchParams.get('error_message')
  const baseUrl = `${url.protocol}//${url.host}`
  const redirectUri = getRedirectUri(req)

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/?oauth=error&message=${encodeURIComponent(error || 'Code manquant')}`)
  }

  const { platform, userId, extra } = parseState(state)
  const config = getConfig()

  try {
    if (platform === 'meta' || platform === 'instagram') {
      const token = await exchangeMetaCode({ code, redirectUri, clientId: config.meta_app_id, clientSecret: config.meta_app_secret })
      const { user, pages } = await getUserPagesAndInstagram(token)
      const filteredPages = platform === 'instagram' ? pages.filter(p => p.instagram_business_account) : pages
      const sessionId = await stashMetaSession({ token, user, pages: filteredPages, instagramOnly: platform === 'instagram', userId })
      return NextResponse.redirect(`${baseUrl}/?oauth=meta-select&session=${sessionId}`)
    }

    if (platform === 'linkedin') {
      const token = await exchangeLinkedInCode({ code, redirectUri, clientId: config.linkedin_client_id, clientSecret: config.linkedin_client_secret })
      const profile = await getLinkedInProfile(token)
      await saveAccount(userId, profile)
      return NextResponse.redirect(`${baseUrl}/?oauth=success&platform=linkedin&name=${encodeURIComponent(profile.name)}`)
    }

    if (platform === 'threads') {
      const token = await exchangeThreadsCode({ code, redirectUri, clientId: config.threads_app_id, clientSecret: config.threads_app_secret })
      const profile = await getThreadsUserInfo(token)
      await saveAccount(userId, profile)
      return NextResponse.redirect(`${baseUrl}/?oauth=success&platform=threads&name=${encodeURIComponent(profile.name)}`)
    }

    if (platform === 'tiktok') {
      const { accessToken } = await exchangeTikTokCode({ code, redirectUri, clientKey: config.tiktok_client_key, clientSecret: config.tiktok_client_secret })
      const profile = await getTikTokUserInfo(accessToken)
      await saveAccount(userId, profile)
      return NextResponse.redirect(`${baseUrl}/?oauth=success&platform=tiktok&name=${encodeURIComponent(profile.name)}`)
    }

    if (platform === 'pinterest') {
      const token = await exchangePinterestCode({ code, redirectUri, clientId: config.pinterest_app_id, clientSecret: config.pinterest_app_secret })
      const profile = await getPinterestProfile(token)
      await saveAccount(userId, profile)
      const boardInfo = profile.pinterest_board_name ? ` (${profile.pinterest_board_name})` : ''
      return NextResponse.redirect(`${baseUrl}/?oauth=success&platform=pinterest&name=${encodeURIComponent(profile.name + boardInfo)}`)
    }

    if (platform === 'mastodon') {
      // extra is the stateId
      const session = await getMastodonOAuthSession(extra)
      if (!session) return NextResponse.redirect(`${baseUrl}/?oauth=error&message=Session+Mastodon+expirée`)
      const token = await exchangeMastodonCode({ instance: session.instance, code, clientId: session.client_id, clientSecret: session.client_secret, redirectUri })
      const profile = await getMastodonProfile(session.instance, token)
      await saveAccount(session.userId, profile)
      return NextResponse.redirect(`${baseUrl}/?oauth=success&platform=mastodon&name=${encodeURIComponent('@' + profile.username + '@' + session.instance)}`)
    }

    return NextResponse.redirect(`${baseUrl}/?oauth=error&message=Plateforme%20inconnue:%20${platform}`)
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Erreur OAuth'
    return NextResponse.redirect(`${baseUrl}/?oauth=error&message=${encodeURIComponent(msg)}`)
  }
}
