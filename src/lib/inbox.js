/**
 * Inbox semi-automatique — orchestration du polling des commentaires
 * et de la pré-génération des réponses IA.
 *
 * Currently supports: Facebook (via Page tokens).
 * To be extended: Instagram, Threads (require scope upgrades).
 */

import { getAccountsByPlatform, upsertComment, getInboxLastPolledAt, setInboxLastPolledAt, updateComment, getComment } from './store'
import { fetchAllPageComments, postCommentReply } from './social/meta'
import { streamReplies } from './ai'

/**
 * Poll Facebook pour les nouveaux commentaires sur tous les comptes connectés.
 * Pour chaque nouveau commentaire, pré-génère 3 réponses IA en parallèle.
 * @param {object} opts
 * @param {boolean} [opts.firstRun=false] - si true, ne récupère que les dernières 24h (pas tout l'historique)
 * @returns {Promise<{ scanned, new_comments, ai_failed }>}
 */
export async function pollFacebookComments({ firstRun = false } = {}) {
  const facebookAccounts = await getAccountsByPlatform('facebook')
  if (facebookAccounts.length === 0) {
    return { scanned: 0, new_comments: 0, ai_failed: 0, error: 'Aucun compte Facebook connecté' }
  }

  // Determine since timestamp: last poll OR 24h ago for first run
  const last = await getInboxLastPolledAt()
  const dayAgo = Math.floor(Date.now() / 1000) - 86400
  const since = firstRun ? dayAgo : (last || dayAgo)

  let scanned = 0
  let newCount = 0
  let aiFailed = 0

  for (const account of facebookAccounts) {
    try {
      const comments = await fetchAllPageComments(account, since, 25)
      scanned += comments.length

      for (const c of comments) {
        // Pour chaque commentaire, on tente l'insertion (upsert by external_id)
        const insertedId = await upsertComment({
          external_id: c.id, // FB comment_id
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
          fb_created_time: c.created_time, // ISO string
          fb_created_at: Math.floor(new Date(c.created_time).getTime() / 1000),
        })

        if (insertedId) {
          newCount++
          // Pre-generate AI replies in background (don't block polling)
          generateAndStoreReplies(insertedId, c.message, 'facebook', c.from?.name).catch(e => {
            console.error('[inbox] AI gen failed for', insertedId, e?.message)
            aiFailed++
          })
        }
      }
    } catch (err) {
      console.error('[inbox] poll error for account', account.id, err?.response?.data || err?.message)
    }
  }

  await setInboxLastPolledAt(Math.floor(Date.now() / 1000))
  return { scanned, new_comments: newCount, ai_failed: aiFailed }
}

/**
 * Génère 3 réponses IA pour un commentaire et les stocke.
 */
async function generateAndStoreReplies(commentInternalId, message, platform, authorName) {
  let acc = ''
  for await (const chunk of streamReplies({ comment: message, platform, author: authorName })) {
    acc += chunk
  }
  const replies = acc
    .split(/\n---\n|\n---\s*$/)
    .map(s => s.trim())
    .filter(Boolean)
  await updateComment(commentInternalId, { ai_replies: replies, ai_generated_at: Math.floor(Date.now() / 1000) })
}

/**
 * Envoie une réponse à un commentaire et met à jour son statut.
 * @param {string} commentInternalId - notre ID interne
 * @param {string} replyText - le texte à publier
 * @returns {Promise<{ success, sent_reply_id?, error? }>}
 */
export async function sendReply(commentInternalId, replyText) {
  const comment = await getComment(commentInternalId)
  if (!comment) return { error: 'Commentaire introuvable' }
  if (comment.status !== 'pending') return { error: `Ce commentaire est déjà ${comment.status}` }

  const accounts = await getAccountsByPlatform(comment.platform)
  const account = accounts.find(a => a.id === comment.account_id)
  if (!account) return { error: 'Compte associé introuvable (peut-être déconnecté)' }

  try {
    let sentReplyId
    if (comment.platform === 'facebook') {
      sentReplyId = await postCommentReply(account, comment.external_id, replyText)
    } else {
      return { error: `Plateforme ${comment.platform} non encore supportée pour l'envoi auto` }
    }

    await updateComment(commentInternalId, {
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

/**
 * Marque un commentaire comme ignoré (sans répondre).
 */
export async function dismissComment(commentInternalId) {
  const comment = await getComment(commentInternalId)
  if (!comment) return { error: 'Commentaire introuvable' }
  await updateComment(commentInternalId, {
    status: 'dismissed',
    dismissed_at: Math.floor(Date.now() / 1000),
  })
  return { success: true }
}
