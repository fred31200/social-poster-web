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
export async function postToTikTok(account, content, mediaPaths = []) {
  const { access_token: token } = account

  if (mediaPaths.length === 0) {
    throw new Error('TikTok requiert au moins une vidéo ou une image.')
  }

  const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaPaths[0])

  if (isVideo) {
    // Video upload workflow
    const fileBuffer = fs.readFileSync(mediaPaths[0])
    const fileSize = fileBuffer.length

    // Step 1: Initialize upload
    const initR = await axios.post(`${TIKTOK_API}/post/publish/video/init/`, {
      post_info: {
        title: content?.slice(0, 150) || '',
        privacy_level: 'PUBLIC_TO_EVERYONE',
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
    }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' } })

    const uploadUrl = initR.data.data?.upload_url
    if (!uploadUrl) throw new Error('TikTok: failed to get upload URL')

    // Step 2: Upload file
    await axios.put(uploadUrl, fileBuffer, {
      headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}` }
    })

    // Step 3: Publish
    const publishR = await axios.post(`${TIKTOK_API}/post/publish/video/`, {
      publish_id: initR.data.data.publish_id
    }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' } })

    return publishR.data.data?.post_id || 'tiktok_video'
  } else {
    // Photo upload — TikTok API requires URL-based image (not direct file upload)
    throw new Error('TikTok API nécessite une URL d\'image publique. Veuillez utiliser une image depuis une URL.')
  }
}
