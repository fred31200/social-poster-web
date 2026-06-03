/**
 * LinkedIn OAuth + posting using v2 UGC Posts API + OIDC userinfo.
 */

import axios from 'axios'
import { getMediaBytes } from '../upload'

// ─── OAuth ──────────────────────────────────────────────────────────────────
export function buildLinkedInOAuthURL({ clientId, redirectUri, state = 'linkedin' }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid,profile,email,w_member_social',
    state,
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export async function exchangeLinkedInCode({ code, clientId, clientSecret, redirectUri }) {
  const r = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
    params: {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }
  })
  return r.data.access_token
}

export async function getLinkedInProfile(token) {
  const r = await axios.get('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const p = r.data
  return {
    platform: 'linkedin',
    platform_user_id: p.sub,
    name: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim(),
    avatar: p.picture || null,
    access_token: token,
  }
}

// ─── Posting ────────────────────────────────────────────────────────────────
export async function postToLinkedIn(account, content, mediaPaths = []) {
  const token = account.access_token
  const authorUrn = `urn:li:person:${account.platform_user_id}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }

  if (mediaPaths.length === 0) {
    const r = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    }, { headers })
    return r.headers['x-restli-id'] || r.data.id
  }

  const mediaAssets = []
  for (const mediaPath of mediaPaths) {
    const isVideo = /\.(mp4|mov|avi)$/i.test(mediaPath)
    const regR = await axios.post('https://api.linkedin.com/v2/assets?action=registerUpload', {
      registerUploadRequest: {
        recipes: [isVideo ? 'urn:li:digitalmediaRecipe:feedshare-video' : 'urn:li:digitalmediaRecipe:feedshare-image'],
        owner: authorUrn,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
      }
    }, { headers })
    const uploadUrl = regR.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl
    await axios.put(uploadUrl, await getMediaBytes(mediaPath), {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': isVideo ? 'video/mp4' : 'image/jpeg' }
    })
    mediaAssets.push({
      status: 'READY',
      description: { text: '' },
      media: regR.data.value.asset,
      title: { text: '' }
    })
  }

  const r = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: mediaPaths.some(p => /\.(mp4|mov|avi)$/i.test(p)) ? 'VIDEO' : 'IMAGE',
        media: mediaAssets
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  }, { headers })
  return r.headers['x-restli-id'] || r.data.id
}
