/**
 * Upload a local file (or Buffer) to a temporary public host so Instagram can fetch it.
 * Tries multiple providers with fallback for reliability.
 */

import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'

export async function uploadToPublicHost(input, filename = 'image.jpg') {
  const getStream = () => {
    if (typeof input === 'string') return fs.createReadStream(input)
    if (Buffer.isBuffer(input)) return input
    return input
  }

  const errors = []

  // 1. catbox.moe — fichiers permanents, HTTPS
  try {
    const fd = new FormData()
    fd.append('reqtype', 'fileupload')
    fd.append('fileToUpload', getStream(), filename)
    const r = await axios.post('https://catbox.moe/user/api.php', fd, {
      headers: { ...fd.getHeaders() },
      maxContentLength: Infinity, maxBodyLength: Infinity,
      timeout: 30000
    })
    const url = String(r.data).trim()
    if (url.startsWith('http')) return url
    errors.push('catbox: ' + url)
  } catch (e) { errors.push('catbox: ' + (e.message || 'failed')) }

  // 2. 0x0.st — fallback
  try {
    const fd = new FormData()
    fd.append('file', getStream(), filename)
    const r = await axios.post('https://0x0.st', fd, {
      headers: { ...fd.getHeaders(), 'User-Agent': 'SocialPosterBiz/1.0' },
      maxContentLength: Infinity, maxBodyLength: Infinity,
      timeout: 30000
    })
    const url = String(r.data).trim()
    if (url.startsWith('http')) return url
    errors.push('0x0.st: ' + url)
  } catch (e) { errors.push('0x0.st: ' + (e.message || 'failed')) }

  // 3. uguu.se — ephemeral 24h
  try {
    const fd = new FormData()
    fd.append('files[]', getStream(), filename)
    const r = await axios.post('https://uguu.se/upload.php?output=text', fd, {
      headers: { ...fd.getHeaders() },
      maxContentLength: Infinity, maxBodyLength: Infinity,
      timeout: 30000
    })
    const url = String(r.data).trim()
    if (url.startsWith('http')) return url
    errors.push('uguu: ' + url)
  } catch (e) { errors.push('uguu: ' + (e.message || 'failed')) }

  throw new Error('Tous les hébergeurs d\'image ont échoué: ' + errors.join(' | '))
}
