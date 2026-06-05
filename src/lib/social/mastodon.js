/**
 * Mastodon API — per-instance OAuth.
 * User enters their instance URL (e.g. mastodon.social, piaille.fr…)
 * App is registered dynamically on each instance and cached in KV.
 */

import axios from 'axios'
import fs from 'fs'
import FormData from 'form-data'

export function mastodonApi(instance) {
  return `https://${instance.replace(/^https?:\/\//, '')}/api/v1`
}

// ─── App registration (cached in KV) ────────────────────────────────────────
export async function registerMastodonApp(instance) {
  const base = instance.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const r = await axios.post(`https://${base}/api/v1/apps`, {
    client_name: 'Social Poster',
    redirect_uris: `${process.env.NEXT_PUBLIC_APP_URL || 'https://social-poster-web.vercel.app'}/api/oauth/callback`,
    scopes: 'read write',
    website: process.env.NEXT_PUBLIC_APP_URL || 'https://social-poster-web.vercel.app',
  })
  return { client_id: r.data.client_id, client_secret: r.data.client_secret }
}

export function buildMastodonOAuthURL({ instance, clientId, redirectUri, state }) {
  const base = instance.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read write',
    state,
  })
  return `https://${base}/oauth/authorize?${params}`
}

export async function exchangeMastodonCode({ instance, code, clientId, clientSecret, redirectUri }) {
  const base = instance.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const r = await axios.post(`https://${base}/oauth/token`, {
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    scope: 'read write',
  })
  return r.data.access_token
}

export async function getMastodonProfile(instance, token) {
  const base = instance.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const r = await axios.get(`https://${base}/api/v1/accounts/verify_credentials`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const a = r.data
  return {
    platform: 'mastodon',
    name: a.display_name || a.username,
    platform_user_id: a.id,
    mastodon_instance: base,
    username: a.username,
    avatar: a.avatar || null,
    access_token: token,
  }
}

// ─── Posting ────────────────────────────────────────────────────────────────
export async function postToMastodon(account, content, mediaPaths = []) {
  const base = (account.mastodon_instance || 'mastodon.social').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const token = account.access_token
  const headers = { Authorization: `Bearer ${token}` }

  const mediaIds = []
  for (const p of mediaPaths.slice(0, 4)) {
    const fd = new FormData()
    fd.append('file', fs.createReadStream(p))
    const mR = await axios.post(`https://${base}/api/v1/media`, fd, { headers: { ...fd.getHeaders(), ...headers } })
    mediaIds.push(mR.data.id)
  }

  const r = await axios.post(`https://${base}/api/v1/statuses`, {
    status: content?.slice(0, 500) || '',
    media_ids: mediaIds,
    visibility: 'public',
  }, { headers: { ...headers, 'Content-Type': 'application/json' } })

  return r.data.id
}
