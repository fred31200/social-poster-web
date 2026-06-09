/**
 * Central publisher — orchestrates posting across multiple platforms.
 */

import { getAccountsByPlatform, savePostResult, updatePostStatus } from './store'
import { postToFacebook, postToInstagram } from './social/meta'
import { postToLinkedIn } from './social/linkedin'
import { postToThreads } from './social/threads'
import { postToTikTok } from './social/tiktok'
import { postToTelegram } from './social/telegram'
import { postToPinterest } from './social/pinterest'
import { postToBluesky } from './social/bluesky'
import { postToMastodon } from './social/mastodon'
import { postToGoogle } from './social/google'

const POSTERS = {
  facebook:  (acc, content, media) => postToFacebook(acc, content, media),
  instagram: (acc, content, media, igPaths) => postToInstagram(acc, content, igPaths),
  linkedin:  (acc, content, media) => postToLinkedIn(acc, content, media),
  threads:   (acc, content, media) => postToThreads(acc, content, media),
  tiktok:    (acc, content, media) => postToTikTok(acc, content, media),
  telegram:  (acc, content, media) => postToTelegram(acc, content, media),
  pinterest: (acc, content, media) => postToPinterest(acc, content, media),
  bluesky:   (acc, content, media) => postToBluesky(acc, content, media),
  mastodon:  (acc, content, media) => postToMastodon(acc, content, media),
  google:    (acc, content, media) => postToGoogle(acc, content, media),
}

export async function publishPost(userId, post) {
  const results = []
  for (const platform of post.platforms) {
    const accounts = await getAccountsByPlatform(userId, platform)
    if (!accounts.length) {
      results.push({ platform, status: 'failed', error: 'Aucun compte connecté pour ' + platform })
      continue
    }
    const account = accounts[0]
    try {
      const igPaths = post.media_paths_instagram?.length ? post.media_paths_instagram : post.media_paths
      const poster = POSTERS[platform]
      if (!poster) throw new Error('Plateforme inconnue: ' + platform)
      const id = await poster(account, post.content, post.media_paths, igPaths)
      await savePostResult(userId, { postId: post.id, platform, accountId: account.id, status: 'published', platformPostId: id })
      results.push({ platform, status: 'published', platformPostId: id })
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.description || err.message || 'Erreur inconnue'
      await savePostResult(userId, { postId: post.id, platform, accountId: account.id, status: 'failed', errorMessage: msg })
      results.push({ platform, status: 'failed', error: msg })
    }
  }
  return results
}
