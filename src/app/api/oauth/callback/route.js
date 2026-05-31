/**
 * OAuth callback handler — receives ?code=...&state=... from the platform's redirect.
 * Exchanges code for token, fetches user info, saves account, then redirects to the home page.
 */

import { NextResponse } from 'next/server'
import { getConfig, getRedirectUri } from '@/lib/config'
import { exchangeMetaCode, getUserPagesAndInstagram } from '@/lib/social/meta'
import { exchangeLinkedInCode, getLinkedInProfile } from '@/lib/social/linkedin'
import { exchangeThreadsCode, getThreadsUserInfo } from '@/lib/social/threads'
import { saveAccount } from '@/lib/store'
import { stashMetaSession } from '@/lib/oauth-session'

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

  const config = getConfig()

  try {
    if (state === 'meta' || state === 'instagram') {
      const token = await exchangeMetaCode({
        code, redirectUri,
        clientId: config.meta_app_id,
        clientSecret: config.meta_app_secret,
      })
      const { user, pages } = await getUserPagesAndInstagram(token)
      const filteredPages = state === 'instagram' ? pages.filter(p => p.instagram_business_account) : pages
      const sessionId = stashMetaSession({ token, user, pages: filteredPages, instagramOnly: state === 'instagram' })
      return NextResponse.redirect(`${baseUrl}/?oauth=meta-select&session=${sessionId}`)
    }

    if (state === 'linkedin') {
      const token = await exchangeLinkedInCode({
        code, redirectUri,
        clientId: config.linkedin_client_id,
        clientSecret: config.linkedin_client_secret,
      })
      const profile = await getLinkedInProfile(token)
      await saveAccount(profile)
      return NextResponse.redirect(`${baseUrl}/?oauth=success&platform=linkedin&name=${encodeURIComponent(profile.name)}`)
    }

    if (state === 'threads') {
      const token = await exchangeThreadsCode({
        code, redirectUri,
        clientId: config.threads_app_id,
        clientSecret: config.threads_app_secret,
      })
      const profile = await getThreadsUserInfo(token)
      await saveAccount(profile)
      return NextResponse.redirect(`${baseUrl}/?oauth=success&platform=threads&name=${encodeURIComponent(profile.name)}`)
    }

    return NextResponse.redirect(`${baseUrl}/?oauth=error&message=Plateforme%20inconnue:%20${state}`)
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || 'Erreur OAuth'
    return NextResponse.redirect(`${baseUrl}/?oauth=error&message=${encodeURIComponent(msg)}`)
  }
}
