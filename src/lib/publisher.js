/**
 * Central publisher — orchestrates posting across multiple platforms.
 */

import { getAccountsByPlatform, savePostResult, updatePostStatus } from './store'
import { postToFacebook, postToInstagram } from './social/meta'
import { postToLinkedIn } from './social/linkedin'
import { postToThreads } from './social/threads'

export async function publishPost(post) {
  const results = []
  for (const platform of post.platforms) {
    const accounts = await getAccountsByPlatform(platform)
    if (!accounts.length) {
      results.push({ platform, status: 'failed', error: 'Aucun compte connecté pour ' + platform })
      continue
    }
    const account = accounts[0]
    try {
      // Instagram uses pre-transformed paths (correct aspect ratio) if provided
      const igPaths = post.media_paths_instagram?.length ? post.media_paths_instagram : post.media_paths
      let id
      if (platform === 'facebook')        id = await postToFacebook(account, post.content, post.media_paths)
      else if (platform === 'instagram')  id = await postToInstagram(account, post.content, igPaths)
      else if (platform === 'linkedin')   id = await postToLinkedIn(account, post.content, post.media_paths)
      else if (platform === 'threads')    id = await postToThreads(account, post.content, post.media_paths)
      else throw new Error('Plateforme inconnue: ' + platform)

      await savePostResult({ postId: post.id, platform, accountId: account.id, status: 'published', platformPostId: id })
      results.push({ platform, status: 'published', platformPostId: id })
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Erreur inconnue'
      await savePostResult({ postId: post.id, platform, accountId: account.id, status: 'failed', errorMessage: msg })
      results.push({ platform, status: 'failed', error: msg })
    }
  }
  return results
}
