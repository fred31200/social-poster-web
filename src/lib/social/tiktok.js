/**
 * TikTok Content Posting API (v2).
 *
 * ⚠️  TikTok requires app review before going live.
 *     Until approved, posts will return a "sandbox" / "permission denied" error.
 *     Connect the account and test in sandbox mode on developers.tiktok.com.
 *
 * Scopes needed: user.info.basic, video.publish, video.upload
 */

import axios from 'axios'
import fs from 'fs'

const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize'
const TIKTOK_API  = 'https://open.tiktokapis.com/v2'

// ─── OAuth ──────────────────────────────────────────────────────────────────
export function buildTikTokOAuthURL({ clientKey, redirectUri, state = 'tiktok' }) {
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: redirectUri,
    state,
  })
  return `${TIKTOK_AUTH}?${params}`
}

export async function exchangeTikTokCode({ code, clientKey, clientSecret, redirectUri }) {
  const r = await axios.post(`${TIKTOK_API}/oauth/token/`, new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  return { accessToken: r.data.access_token, openId: r.data.open_id, scope: r.data.scope }
}

export async function getTikTokUserInfo(accessToken) {
  const r = await axios.get(`${TIKTOK_API}/user/info/`, {
    params: { fields: 'display_name,avatar_url,open_id' },
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const user = r.data.data?.user || {}
  return {
    platform: 'tiktok',
    name: user.display_name || 'TikTok User',
    platform_user_id: user.open_id,
    avatar: user.avatar_url || null,
    access_token: accessToken,
  }
}

// ─── Posting ────────────────────────────────────────────────────────────────

// En prod les médias sont des URLs publiques (catbox) ; en dev, des chemins locaux.
async function loadMediaBuffer(ref) {
  if (/^https?:\/\//i.test(ref)) {
    const r = await axios.get(ref, { responseType: 'arraybuffer', maxContentLength: Infinity })
    return Buffer.from(r.data)
  }
  return fs.readFileSync(ref)
}

export async function postToTikTok(account, content, mediaPaths = []) {
  const { access_token: token } = account
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' }

  if (mediaPaths.length === 0) {
    throw new Error('TikTok requiert au moins une vidéo (MP4, MOV ou WebM).')
  }

  const ref = mediaPaths[0]
  const isVideo = /\.(mp4|mov|avi|webm)(\?|$)/i.test(ref)
  if (!isVideo) {
    throw new Error('TikTok : seules les vidéos sont prises en charge pour le moment (MP4, MOV, WebM).')
  }

  // Niveau de confidentialité réellement autorisé pour ce créateur.
  // Tant que l'app n'est pas validée par TikTok, seul SELF_ONLY (privé) est accepté.
  let privacyLevel = 'SELF_ONLY'
  try {
    const ci = await axios.post(`${TIKTOK_API}/post/publish/creator_info/query/`, {}, { headers })
    const options = ci.data?.data?.privacy_level_options || []
    if (options.includes('PUBLIC_TO_EVERYONE')) privacyLevel = 'PUBLIC_TO_EVERYONE'
    else if (options.length) privacyLevel = options[0]
  } catch { /* SELF_ONLY par défaut */ }

  const fileBuffer = await loadMediaBuffer(ref)
  const fileSize = fileBuffer.length

  // Step 1: init direct post
  const initR = await axios.post(`${TIKTOK_API}/post/publish/video/init/`, {
    post_info: {
      title: content?.slice(0, 150) || '',
      privacy_level: privacyLevel,
      disable_duet: false,
      disable_stitch: false,
      disable_comment: false,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: fileSize,
      chunk_size: fileSize,
      total_chunk_count: 1,
    },
  }, { headers })

  const { upload_url: uploadUrl, publish_id: publishId } = initR.data?.data || {}
  if (!uploadUrl || !publishId) {
    throw new Error(`TikTok init : ${initR.data?.error?.message || 'réponse inattendue'}`)
  }

  // Step 2: upload du fichier
  await axios.put(uploadUrl, fileBuffer, {
    headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}` },
    maxBodyLength: Infinity,
  })

  // Step 3: TikTok traite puis publie automatiquement — on confirme via le statut
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const st = await axios.post(`${TIKTOK_API}/post/publish/status/fetch/`, { publish_id: publishId }, { headers })
    const status = st.data?.data?.status
    if (status === 'PUBLISH_COMPLETE') return publishId
    if (status === 'FAILED') {
      throw new Error(`TikTok : publication échouée (${st.data?.data?.fail_reason || 'raison inconnue'})`)
    }
  }
  // Toujours en traitement côté TikTok après ~25 s : la vidéo apparaîtra d'ici peu
  return publishId
}
