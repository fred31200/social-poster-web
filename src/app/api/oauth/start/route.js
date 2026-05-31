/**
 * Returns an OAuth URL for the given platform.
 * The renderer then redirects the browser to this URL.
 */

import { NextResponse } from 'next/server'
import { getConfig, getRedirectUri } from '@/lib/config'
import { buildMetaOAuthURL } from '@/lib/social/meta'
import { buildLinkedInOAuthURL } from '@/lib/social/linkedin'
import { buildThreadsOAuthURL } from '@/lib/social/threads'

export async function POST(req) {
  const { platform } = await req.json()
  const config = getConfig()
  const redirectUri = getRedirectUri(req)

  let url = null
  if (platform === 'meta' || platform === 'instagram') {
    if (!config.meta_app_id) return NextResponse.json({ error: 'Meta App ID manquant — va dans Comptes > Configurer Facebook' }, { status: 400 })
    url = buildMetaOAuthURL({ clientId: config.meta_app_id, redirectUri, state: platform })
  } else if (platform === 'linkedin') {
    if (!config.linkedin_client_id) return NextResponse.json({ error: 'LinkedIn Client ID manquant' }, { status: 400 })
    url = buildLinkedInOAuthURL({ clientId: config.linkedin_client_id, redirectUri, state: 'linkedin' })
  } else if (platform === 'threads') {
    if (!config.threads_app_id) return NextResponse.json({ error: 'Threads App ID manquant' }, { status: 400 })
    url = buildThreadsOAuthURL({ clientId: config.threads_app_id, redirectUri, state: 'threads' })
  } else {
    return NextResponse.json({ error: 'Plateforme non supportée: ' + platform }, { status: 400 })
  }

  return NextResponse.json({ success: true, url })
}
