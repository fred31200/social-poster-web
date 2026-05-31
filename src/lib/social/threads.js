/**
 * Threads OAuth + posting (Meta's API for Threads).
 */

import axios from 'axios'

const THREADS_API = 'https://graph.threads.net/v1.0'

// ─── OAuth ──────────────────────────────────────────────────────────────────
export function buildThreadsOAuthURL({ clientId, redirectUri, state = 'threads' }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
    state,
  })
  return `https://www.threads.com/oauth/authorize/?${params}`
}

export async function exchangeThreadsCode({ code, clientId, clientSecret, redirectUri }) {
  const fd = new URLSearchParams()
  fd.append('client_id', clientId)
  fd.append('client_secret', clientSecret)
  fd.append('grant_type', 'authorization_code')
  fd.append('redirect_uri', redirectUri)
  fd.append('code', code)
  const r = await axios.post('https://graph.threads.net/oauth/access_token', fd, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  const shortToken = r.data.access_token

  // Exchange short-lived → long-lived (60 days)
  try {
    const longR = await axios.get('https://graph.threads.net/access_token', {
      params: { grant_type: 'th_exchange_token', client_secret: clientSecret, access_token: shortToken }
    })
    return longR.data.access_token
  } catch { return shortToken }
}

export async function getThreadsUserInfo(token) {
  const r = await axios.get(`${THREADS_API}/me`, {
    params: { fields: 'id,username,name,threads_profile_picture_url', access_token: token }
  })
  const u = r.data
  return {
    platform: 'threads',
    platform_user_id: u.id,
    name: u.name || u.username,
    username: u.username,
    avatar: u.threads_profile_picture_url || null,
    access_token: token,
  }
}

// ─── Posting ────────────────────────────────────────────────────────────────
export async function postToThreads(account, content, mediaPaths = []) {
  const token = account.access_token
  const userId = account.platform_user_id

  // Threads currently only supports text via API (media requires a public URL workflow)
  if (mediaPaths.length > 0) {
    throw new Error("Threads ne supporte pas encore l'envoi de médias depuis le disque local (nécessite une URL publique).")
  }

  // Step 1: create text-only media container
  const containerR = await axios.post(`${THREADS_API}/${userId}/threads`, null, {
    params: { media_type: 'TEXT', text: content.substring(0, 500), access_token: token }
  })
  const creationId = containerR.data.id

  // Step 2: publish container
  const pubR = await axios.post(`${THREADS_API}/${userId}/threads_publish`, null, {
    params: { creation_id: creationId, access_token: token }
  })
  return pubR.data.id
}
