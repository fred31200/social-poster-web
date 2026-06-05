/**
 * Telegram Bot API.
 * No OAuth — user provides a Bot Token + Channel ID/username.
 *
 * Setup:
 *  1. Create a bot via @BotFather → get token (e.g. 1234567890:ABCdef...)
 *  2. Add the bot as admin to your channel
 *  3. Get channel ID: @channelname or numeric ID like -1001234567890
 */

import axios from 'axios'
import fs from 'fs'
import FormData from 'form-data'

function apiUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`
}

export async function getTelegramChatInfo(token, chatId) {
  const r = await axios.get(apiUrl(token, 'getChat'), { params: { chat_id: chatId } })
  return r.data.result
}

export async function postToTelegram(account, content, mediaPaths = []) {
  const token = account.access_token
  const chatId = account.page_id || account.platform_user_id

  if (mediaPaths.length === 0) {
    const r = await axios.post(apiUrl(token, 'sendMessage'), { chat_id: chatId, text: content, parse_mode: 'HTML' })
    return String(r.data.result.message_id)
  }

  const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaPaths[0])

  if (mediaPaths.length === 1) {
    const fd = new FormData()
    fd.append('chat_id', chatId)
    fd.append('caption', content || '')
    fd.append(isVideo ? 'video' : 'photo', fs.createReadStream(mediaPaths[0]))
    const r = await axios.post(apiUrl(token, isVideo ? 'sendVideo' : 'sendPhoto'), fd, { headers: fd.getHeaders() })
    return String(r.data.result.message_id)
  }

  // Multiple media → media group (max 10)
  const group = mediaPaths.slice(0, 10).map((p, i) => ({
    type: /\.(mp4|mov|avi|webm)$/i.test(p) ? 'video' : 'photo',
    media: `attach://file${i}`,
    ...(i === 0 ? { caption: content || '' } : {})
  }))
  const fd = new FormData()
  fd.append('chat_id', chatId)
  fd.append('media', JSON.stringify(group))
  mediaPaths.slice(0, 10).forEach((p, i) => fd.append(`file${i}`, fs.createReadStream(p)))
  const r = await axios.post(apiUrl(token, 'sendMediaGroup'), fd, { headers: fd.getHeaders() })
  return String(r.data.result[0]?.message_id || 'telegram')
}
