/**
 * Threads OAuth + posting (Meta's API for Threads).
 */

import axios from 'axios'
import { uploadToPublicHost } from '../upload'

const THREADS_API = 'https://graph.threads.net/v1.0'
const isUrl = (p) => /^https?:\/\//i.test(p)

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

// Threads traite les médias de façon asynchrone : on attend que le conteneur soit prêt.
async function waitThreadsReady(containerId, token) {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    const r = await axios.get(`${THREADS_API}/${containerId}`, {
      params: { fields: 'status,error_message', access_token: token }
    })
    if (r.data.status === 'FINISHED') return
    if (r.data.status === 'ERROR' || r.data.status === 'EXPIRED') {
      throw new Error('Threads: ' + (r.data.error_message || r.data.status))
    }
    await new Promise(res => setTimeout(res, 2500))
  }
  throw new Error('Threads: délai de traitement du média dépassé (60s)')
}

async function publishThreadsContainer(userId, token, creationId) {
  const pubR = await axios.post(`${THREADS_API}/${userId}/threads_publish`, null, {
    params: { creation_id: creationId, access_token: token }
  })
  return pubR.data.id
}

export async function postToThreads(account, content, mediaPaths = []) {
  const token = account.access_token
  const userId = account.platform_user_id
  const text = (content || '').substring(0, 500)

  // ── Texte seul ──
  if (mediaPaths.length === 0) {
    const containerR = await axios.post(`${THREADS_API}/${userId}/threads`, null, {
      params: { media_type: 'TEXT', text, access_token: token }
    })
    return await publishThreadsContainer(userId, token, containerR.data.id)
  }

  // ── Avec média ── Threads a besoin d'URLs HTTPS publiques (déjà le cas en prod
  // via /api/upload ; en dev on uploade les fichiers locaux vers un hébergeur).
  const urls = await Promise.all(mediaPaths.map(p => isUrl(p) ? p : uploadToPublicHost(p)))
  const mediaParams = (url) => /\.(mp4|mov|avi)$/i.test(url)
    ? { media_type: 'VIDEO', video_url: url }
    : { media_type: 'IMAGE', image_url: url }

  let creationId
  if (urls.length === 1) {
    const r = await axios.post(`${THREADS_API}/${userId}/threads`, null, {
      params: { ...mediaParams(urls[0]), text, access_token: token }
    })
    creationId = r.data.id
  } else {
    // Carrousel : un conteneur "item" par média, puis un conteneur CAROUSEL
    const childIds = []
    for (const url of urls.slice(0, 10)) {
      const cr = await axios.post(`${THREADS_API}/${userId}/threads`, null, {
        params: { ...mediaParams(url), is_carousel_item: true, access_token: token }
      })
      await waitThreadsReady(cr.data.id, token)
      childIds.push(cr.data.id)
    }
    const r = await axios.post(`${THREADS_API}/${userId}/threads`, null, {
      params: { media_type: 'CAROUSEL', children: childIds.join(','), text, access_token: token }
    })
    creationId = r.data.id
  }

  await waitThreadsReady(creationId, token)
  return await publishThreadsContainer(userId, token, creationId)
}
