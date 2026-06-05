/**
 * Pinterest API v5 — OAuth 2.0 + Pin creation.
 * Register your app at developers.pinterest.com
 * Scopes: boards:read, pins:write, user_accounts:read
 */

import axios from 'axios'
import fs from 'fs'

const PIN_API = 'https://api.pinterest.com/v5'

// ─── OAuth ──────────────────────────────────────────────────────────────────
export function buildPinterestOAuthURL({ clientId, redirectUri, state = 'pinterest' }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'boards:read,pins:write,user_accounts:read',
    state,
  })
  return `https://www.pinterest.com/oauth/?${params}`
}

export async function exchangePinterestCode({ code, clientId, clientSecret, redirectUri }) {
  const r = await axios.post(`${PIN_API}/oauth/token`, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    auth: { username: clientId, password: clientSecret },
  })
  return r.data.access_token
}

export async function getPinterestProfile(token) {
  const [userR, boardsR] = await Promise.all([
    axios.get(`${PIN_API}/user_account`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${PIN_API}/boards`, { headers: { Authorization: `Bearer ${token}` }, params: { page_size: 50 } }),
  ])
  const user = userR.data
  const boards = boardsR.data.items || []
  return {
    platform: 'pinterest',
    name: user.username || user.display_name || 'Pinterest',
    platform_user_id: user.username,
    avatar: user.profile_image || null,
    access_token: token,
    pinterest_board_id: boards[0]?.id || null,
    pinterest_board_name: boards[0]?.name || null,
    pinterest_boards: boards.map(b => ({ id: b.id, name: b.name })),
  }
}

// ─── Posting ────────────────────────────────────────────────────────────────
export async function postToPinterest(account, content, mediaPaths = []) {
  const token = account.access_token
  const boardId = account.pinterest_board_id
  if (!boardId) throw new Error('Aucun tableau Pinterest sélectionné. Reconnecte ton compte Pinterest.')

  const body = {
    board_id: boardId,
    title: content?.slice(0, 100) || '',
    description: content?.slice(0, 500) || '',
    alt_text: '',
  }

  if (mediaPaths.length > 0 && !/\.(mp4|mov|avi|webm)$/i.test(mediaPaths[0])) {
    const imageBytes = fs.readFileSync(mediaPaths[0])
    body.media_source = {
      source_type: 'image_base64',
      content_type: mediaPaths[0].endsWith('.png') ? 'image/png' : 'image/jpeg',
      data: imageBytes.toString('base64'),
    }
  } else {
    // Pinterest requires an image — use a placeholder note if none
    if (mediaPaths.length === 0) throw new Error('Pinterest requiert une image pour créer un Pin.')
  }

  const r = await axios.post(`${PIN_API}/pins`, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  })
  return r.data.id
}
