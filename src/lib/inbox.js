/**
 * Inbox semi-automatique — polling des commentaires Facebook + pré-génération de réponses IA.
 */

import { getAccountsByPlatform, upsertComment, getInboxLastPolledAt, setInboxLastPolledAt, updateComment, getComment } from './store'
import { fetchAllPageComments, postCommentReply, fetchAllInstagramComments, postInstagramCommentReply } from './social/meta'
import { streamReplies } from './ai'

export async function pollFacebookComments({ userId, firstRun = false } = {}) {
  const facebookAccounts = await getAccountsByPlatform(userId, 'facebook')
  const instagramAccounts = await getAccountsByPlatform(userId, 'instagram')
  if (facebookAccounts.length === 0 && instagramAccounts.length === 0) {
    return { scanned: 0, new_comments: 0, ai_failed: 0, error: 'Aucun compte Facebook ou Instagram connecté' }
  }

  const last = await getInboxLastPolledAt(userId)
  const dayAgo = Math.floor(Date.now() / 1000) - 86400
  const since = firstRun ? dayAgo : (last || dayAgo)

  let scanned = 0, newCount = 0, aiFailed = 0

  for (const account of facebookAccounts) {
    try {
      const comments = await fetchAllPageComments(account, since, 25)
      scanned += comments.length

      for (const c of comments) {
        const insertedId = await upsertComment(userId, {
          external_id: c.id,
          account_id: account.id,
          platform: 'facebook',
          page_id: account.page_id,
          page_name: account.page_name || account.name,
          post_id: c.post_id,
          post_message: c.post_message || '',
          post_url: c.post_url,
          author_id: c.from?.id || null,
          author_name: c.from?.name || 'Anonyme',
          author_picture: c.from?.picture?.data?.url || null,
          message: c.message || '',
          fb_created_time: c.created_time,
          fb_created_at: Math.floor(new Date(c.created_time).getTime() / 1000),
        })

        // Pas de génération IA automatique ici : les réponses sont générées À LA
        // DEMANDE (bouton dans l'Inbox) → le poll reste instantané, zéro lag.
        if (insertedId) newCount++
      }
    } catch (err) {
      console.error('[inbox] poll error for account', account.id, err?.response?.data || err?.message)
    }
  }

  // Commentaires Instagram — même Inbox, mêmes réponses IA à la demande
  for (const account of instagramAccounts) {
    try {
      const comments = await fetchAllInstagramComments(account, since, 25)
      scanned += comments.length
      for (const c of comments) {
        const insertedId = await upsertComment(userId, {
          external_id: c.id,
          account_id: account.id,
          platform: 'instagram',
          page_id: account.instagram_account_id || account.page_id,
          page_name: account.page_name || account.name,
          post_id: c.post_id,
          post_message: c.post_message || '',
          post_url: c.post_url,
          author_id: c.from?.id || null,
          author_name: c.from?.name || 'Anonyme',
          author_picture: null,
          message: c.message || '',
          fb_created_time: c.created_time,
          fb_created_at: Math.floor(new Date(c.created_time).getTime() / 1000),
        })
        if (insertedId) newCount++
      }
    } catch (err) {
      console.error('[inbox] poll IG error for account', account.id, err?.response?.data || err?.message)
    }
  }

  await setInboxLastPolledAt(userId, Math.floor(Date.now() / 1000))
  return { scanned, new_comments: newCount, ai_failed: aiFailed }
}

export async function generateAndStoreReplies(userId, commentId, message, platform, authorName) {
  let acc = ''
  for await (const chunk of streamReplies({ comment: message, platform, author: authorName })) {
    acc += chunk
  }
  const replies = acc.split(/\n---\n|\n---\s*$/).map(s => s.trim()).filter(Boolean)
  await updateComment(userId, commentId, { ai_replies: replies, ai_generated_at: Math.floor(Date.now() / 1000) })
  return replies
}

export async function sendReply(userId, commentInternalId, replyText) {
  const comment = await getComment(userId, commentInternalId)
  if (!comment) return { error: 'Commentaire introuvable' }
  if (comment.status !== 'pending') return { error: `Ce commentaire est déjà ${comment.status}` }

  const accounts = await getAccountsByPlatform(userId, comment.platform)
  const account = accounts.find(a => a.id === comment.account_id)
  if (!account) return { error: 'Compte associé introuvable (peut-être déconnecté)' }

  try {
    let sentReplyId
    if (comment.platform === 'facebook') {
      sentReplyId = await postCommentReply(account, comment.external_id, replyText)
    } else if (comment.platform === 'instagram') {
      sentReplyId = await postInstagramCommentReply(account, comment.external_id, replyText)
    } else {
      return { error: `Plateforme ${comment.platform} non encore supportée pour l'envoi auto` }
    }
    await updateComment(userId, commentInternalId, {
      status: 'replied',
      sent_reply_text: replyText,
      sent_reply_external_id: sentReplyId,
      sent_at: Math.floor(Date.now() / 1000),
    })
    return { success: true, sent_reply_id: sentReplyId }
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message
    return { error: msg }
  }
}

export async function dismissComment(userId, commentInternalId) {
  const comment = await getComment(userId, commentInternalId)
  if (!comment) return { error: 'Commentaire introuvable' }
  await updateComment(userId, commentInternalId, {
    status: 'dismissed',
    dismissed_at: Math.floor(Date.now() / 1000),
  })
  return { success: true }
}
