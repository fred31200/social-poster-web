/**
 * Meta (Facebook + Instagram) OAuth + posting.
 * Adapted from the Electron app — same Graph API logic.
 */

import axios from 'axios'
import fs from 'fs'
import FormData from 'form-data'
import { uploadToPublicHost } from '../upload'

const META_API = 'https://graph.facebook.com/v19.0'

// ─── OAuth ──────────────────────────────────────────────────────────────────
export function buildMetaOAuthURL({ clientId, redirectUri, state = 'meta' }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    // pages_manage_engagement = répondre aux commentaires (semi-auto Inbox)
    scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_engagement,instagram_content_publish,public_profile',
    response_type: 'code',
    state,
    auth_type: 'rerequest',
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
}

export async function exchangeMetaCode({ code, clientId, clientSecret, redirectUri }) {
  const r = await axios.get(`${META_API}/oauth/access_token`, {
    params: { client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }
  })
  return r.data.access_token
}

export async function getUserPagesAndInstagram(accessToken) {
  const [pagesRes, meRes] = await Promise.all([
    axios.get(`${META_API}/me/accounts`, {
      params: {
        fields: 'id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}',
        access_token: accessToken
      }
    }).catch((e) => { console.error('[Meta pages]', e?.response?.data || e?.message); return { data: { data: [] } } }),
    axios.get(`${META_API}/me`, {
      params: { fields: 'id,name,picture', access_token: accessToken }
    })
  ])
  const pages = pagesRes.data.data || []
  // Fallback: try /instagram_accounts edge for pages without instagram_business_account
  await Promise.all(pages.map(async (page) => {
    if (!page.instagram_business_account) {
      try {
        const igRes = await axios.get(`${META_API}/${page.id}/instagram_accounts`, {
          params: { fields: 'id,name,username,profile_picture_url', access_token: page.access_token }
        })
        if (igRes.data.data && igRes.data.data.length > 0) {
          page.instagram_business_account = igRes.data.data[0]
        }
      } catch (e) { console.error('[IG accounts]', e?.response?.data || e?.message) }
    }
  }))
  return { user: meRes.data, pages }
}

// ─── Posting: Facebook ──────────────────────────────────────────────────────
const isUrl = (p) => /^https?:\/\//i.test(p)

/**
 * Publie une photo sur la Page et renvoie son ID.
 * media = URL publique (prod, Vercel) → on passe le paramètre `url` (Facebook va
 *         chercher l'image lui-même) ; OU chemin local (dev) → upload du fichier.
 */
async function uploadFacebookPhoto(pageId, token, media, extra = {}) {
  if (isUrl(media)) {
    const r = await axios.post(`${META_API}/${pageId}/photos`, { url: media, access_token: token, ...extra })
    return r.data.id
  }
  const fd = new FormData()
  fd.append('source', fs.createReadStream(media))
  fd.append('access_token', token)
  for (const [k, v] of Object.entries(extra)) fd.append(k, String(v))
  const r = await axios.post(`${META_API}/${pageId}/photos`, fd, { headers: fd.getHeaders() })
  return r.data.id
}

export async function postToFacebook(account, content, mediaPaths = []) {
  const { access_token: token, page_id: pageId } = account
  if (mediaPaths.length === 0) {
    const r = await axios.post(`${META_API}/${pageId}/feed`, { message: content, access_token: token })
    return r.data.id
  }
  if (mediaPaths.length === 1) {
    return await uploadFacebookPhoto(pageId, token, mediaPaths[0], { caption: content })
  }
  // Multi-photo album : on uploade chaque photo non publiée, puis on les attache au post
  const photoIds = await Promise.all(mediaPaths.map(async (p) => ({
    media_fbid: await uploadFacebookPhoto(pageId, token, p, { published: 'false' })
  })))
  const r = await axios.post(`${META_API}/${pageId}/feed`, {
    message: content,
    attached_media: photoIds,
    access_token: token
  })
  return r.data.id
}

// ─── Comments: récupération + réponse ─────────────────────────────────────

/**
 * Récupère les posts récents d'une Page (pour avoir le contexte).
 */
export async function fetchPagePosts(account, limit = 25) {
  const { access_token: token, page_id: pageId } = account
  const r = await axios.get(`${META_API}/${pageId}/posts`, {
    params: { fields: 'id,message,created_time,permalink_url', limit, access_token: token }
  })
  return r.data.data || []
}

/**
 * Récupère les commentaires d'un post Facebook.
 * @param {string} sinceUnix - timestamp Unix, ne récupère que les commentaires depuis cette date (optionnel)
 */
export async function fetchPostComments(account, postId, sinceUnix = null) {
  const { access_token: token } = account
  const params = {
    fields: 'id,from{id,name,picture},message,created_time,parent,user_likes,like_count',
    order: 'reverse_chronological',
    limit: 50,
    access_token: token,
  }
  if (sinceUnix) params.since = sinceUnix
  const r = await axios.get(`${META_API}/${postId}/comments`, { params })
  return r.data.data || []
}

/**
 * Récupère TOUS les commentaires sur les N derniers posts d'une Page.
 * Retourne un tableau enrichi avec le contexte du post parent.
 * @param {object} account - le compte Facebook
 * @param {number} sinceUnix - ne récupère que les commentaires depuis ce timestamp
 * @param {number} maxPosts - sur les N derniers posts (défaut 25)
 */
export async function fetchAllPageComments(account, sinceUnix = null, maxPosts = 25) {
  const posts = await fetchPagePosts(account, maxPosts)
  const allComments = []
  // Process posts in parallel (Facebook API supports it well)
  await Promise.all(posts.map(async (post) => {
    try {
      const comments = await fetchPostComments(account, post.id, sinceUnix)
      for (const c of comments) {
        // Skip comments by the Page itself (not really "user" comments)
        if (c.from?.id === account.page_id) continue
        allComments.push({
          ...c,
          post_id: post.id,
          post_message: post.message,
          post_url: post.permalink_url,
        })
      }
    } catch (e) {
      console.error('[meta comments]', post.id, e?.response?.data || e?.message)
    }
  }))
  return allComments
}

/**
 * Poste une réponse à un commentaire Facebook.
 * Nécessite le scope pages_manage_engagement.
 * @returns {string} ID du commentaire de réponse créé
 */
export async function postCommentReply(account, commentId, message) {
  const { access_token: token } = account
  const r = await axios.post(`${META_API}/${commentId}/comments`,
    { message, access_token: token }
  )
  return r.data.id
}

// ─── Posting: Instagram ─────────────────────────────────────────────────────
export async function postToInstagram(account, content, mediaPaths = []) {
  const { access_token: token, instagram_account_id: igId } = account
  if (!igId) throw new Error('Compte Instagram Business non trouvé')
  if (mediaPaths.length === 0) throw new Error('Instagram nécessite au moins une image ou vidéo')

  // Instagram a besoin d'URLs HTTPS. En prod les médias sont déjà des URLs
  // publiques (uploadées à l'upload) ; en dev on uploade les fichiers locaux.
  const publicUrls = await Promise.all(mediaPaths.map(p => isUrl(p) ? p : uploadToPublicHost(p)))

  const createMedia = async (publicUrl, mediaPath, extra = {}) => {
    const isVideo = /\.(mp4|mov|avi)$/i.test(mediaPath)
    const r = await axios.post(`${META_API}/${igId}/media`, {
      [isVideo ? 'video_url' : 'image_url']: publicUrl,
      ...extra, access_token: token
    })
    return r.data.id
  }

  const waitReady = async (containerId) => {
    const start = Date.now()
    let lastStatus = null
    while (Date.now() - start < 60000) {
      const r = await axios.get(`${META_API}/${containerId}`, {
        params: { fields: 'status_code,status', access_token: token }
      })
      lastStatus = r.data
      if (r.data.status_code === 'FINISHED') return
      if (r.data.status_code === 'ERROR')   throw new Error('Instagram: ' + (r.data.status || 'erreur traitement média'))
      if (r.data.status_code === 'EXPIRED') throw new Error('Instagram: container expiré (image inaccessible?)')
      await new Promise(res => setTimeout(res, 2500))
    }
    throw new Error('Instagram timeout (60s) — dernier statut: ' + JSON.stringify(lastStatus))
  }

  let containerId
  if (mediaPaths.length === 1) {
    containerId = await createMedia(publicUrls[0], mediaPaths[0], { caption: content })
  } else {
    const childIds = await Promise.all(mediaPaths.map((p, i) => createMedia(publicUrls[i], p, { is_carousel_item: true })))
    const r = await axios.post(`${META_API}/${igId}/media`, {
      media_type: 'CAROUSEL', caption: content, children: childIds.join(','), access_token: token
    })
    containerId = r.data.id
  }
  await waitReady(containerId)
  await new Promise(res => setTimeout(res, 1500))
  try {
    const pub = await axios.post(`${META_API}/${igId}/media_publish`, { creation_id: containerId, access_token: token })
    return pub.data.id
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message
    try {
      const s = await axios.get(`${META_API}/${containerId}`, { params: { fields: 'status_code,status', access_token: token } })
      throw new Error(`${msg} (statut container: ${s.data.status || s.data.status_code})`)
    } catch { throw new Error(msg) }
  }
}
