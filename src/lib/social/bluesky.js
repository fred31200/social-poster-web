/**
 * Bluesky (AT Protocol) posting.
 * No OAuth — user provides their handle + an App Password.
 *
 * Setup:
 *  1. Go to bsky.app → Settings → Privacy and Security → App Passwords
 *  2. Create an App Password (format: xxxx-xxxx-xxxx-xxxx)
 *  3. Enter handle (e.g. username.bsky.social) + app password here
 */

import axios from 'axios'
import fs from 'fs'

const BSKY = 'https://bsky.social/xrpc'

export async function createBlueskySession(handle, appPassword) {
  const r = await axios.post(`${BSKY}/com.atproto.server.createSession`, {
    identifier: handle, password: appPassword
  })
  return { accessJwt: r.data.accessJwt, did: r.data.did, handle: r.data.handle }
}

export async function getBlueskyProfile(handle, appPassword) {
  const session = await createBlueskySession(handle, appPassword)
  return {
    platform: 'bluesky',
    name: session.handle,
    platform_user_id: session.did,
    access_token: appPassword,
    bluesky_handle: handle,
    avatar: null,
  }
}

export async function postToBluesky(account, content, mediaPaths = []) {
  const session = await createBlueskySession(account.bluesky_handle || account.name, account.access_token)
  const { accessJwt, did } = session

  const record = {
    '$type': 'app.bsky.feed.post',
    text: content?.slice(0, 300) || '',
    createdAt: new Date().toISOString(),
  }

  if (mediaPaths.length > 0) {
    const images = []
    for (const p of mediaPaths.slice(0, 4)) {
      if (/\.(mp4|mov|avi|webm)$/i.test(p)) continue // Bluesky video not yet supported
      const bytes = fs.readFileSync(p)
      const ext = p.split('.').pop().toLowerCase()
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
      const blobR = await axios.post(`${BSKY}/com.atproto.repo.uploadBlob`, bytes, {
        headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': mimeType }
      })
      images.push({ image: blobR.data.blob, alt: '' })
    }
    if (images.length > 0) {
      record.embed = { '$type': 'app.bsky.embed.images', images }
    }
  }

  const r = await axios.post(`${BSKY}/com.atproto.repo.createRecord`, {
    repo: did,
    collection: 'app.bsky.feed.post',
    record,
  }, { headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' } })

  return r.data.cid || 'bluesky'
}
