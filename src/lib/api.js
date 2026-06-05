/**
 * Client API layer — wraps fetch calls to /api/* Next.js routes.
 * Mirrors the shape of the Electron `window.api.*` so the existing components keep working.
 *
 * Files: In the Electron app, mediaPaths were OS file paths read directly via Node fs.
 * In the web app, we upload each File via /api/upload first, which writes it to .data/tmp
 * and returns a server-side path. The renderer then passes those paths into createPost.
 */

async function get(path) {
  const r = await fetch(path)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `GET ${path} → ${r.status}`)
  return r.json()
}

async function postJson(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `POST ${path} → ${r.status}`)
  return r.json()
}

async function del(path) {
  const r = await fetch(path, { method: 'DELETE' })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `DELETE ${path} → ${r.status}`)
  return r.json()
}

async function uploadForm(path, formData) {
  const r = await fetch(path, { method: 'POST', body: formData })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `POST ${path} → ${r.status}`)
  return r.json()
}

// Safe wrapper — returns { error: msg } instead of throwing, so the UI can show toasts
async function safe(promise, fallback) {
  try { return await promise } catch (e) { return fallback !== undefined ? fallback : { error: e.message } }
}

export const api = {
  // ── Config ──
  getConfig: () => safe(get('/api/config'), {}),
  setConfig: (updates) => safe(postJson('/api/config', updates), {}),

  // ── Accounts ──
  listAccounts:    () => safe(get('/api/accounts'), []),
  deleteAccount:   (id) => safe(del(`/api/accounts/${id}`), { success: false }),
  addAccountManual: (data) => safe(postJson('/api/accounts/manual', data)),
  addMetaPage:     (data) => safe(postJson('/api/accounts/meta-page', data)),

  // ── OAuth ──
  // For web: returns { url } that the frontend redirects window.location.href to.
  // After OAuth, the platform redirects to /api/oauth/callback which saves the account
  // and redirects to / with ?oauth=success or ?oauth=meta-select&session=...
  startOAuth: async ({ platform, ...extra }) => {
    const r = await safe(postJson('/api/oauth/start', { platform, ...extra }))
    if (r.error) return r
    // Redirect the whole window — this is the right flow for web OAuth
    window.location.href = r.url
    return { redirecting: true }
  },

  // After OAuth callback with ?oauth=meta-select&session=...
  getMetaSession: (sessionId) => safe(get(`/api/oauth/meta-session/${sessionId}`)),

  // ── Posts ──
  createPost:    (data) => safe(postJson('/api/posts', data)),
  listPosts:     () => safe(get('/api/posts'), []),
  listScheduled: () => safe(get('/api/posts/scheduled'), []),
  cancelPost:    (id) => safe(postJson(`/api/posts/${id}/cancel`), { success: false }),

  // ── Files (web: actual upload to server) ──
  pickFiles: async () => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.accept = 'image/*,video/*'
      input.onchange = () => resolve(Array.from(input.files || []))
      input.click()
    })
  },

  // Upload a File (browser File object) → returns { path, igPath, meta } from server
  uploadFile: async (file, igMode) => {
    const fd = new FormData()
    fd.append('file', file)
    if (igMode) fd.append('igMode', igMode)
    return safe(uploadForm('/api/upload', fd))
  },

  // ── Image (web: client-side preview via Image API for fast feedback) ──
  imageMetadata: (file) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ success: true, width: img.naturalWidth, height: img.naturalHeight, ratio: img.naturalWidth / img.naturalHeight, format: file.type.split('/')[1] })
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ error: 'Image illisible' }) }
      img.src = url
    })
  },

  // ── Live events (web: just refetch posts list; SSE could be added later) ──
  onPostPublished: (cb) => () => {},
}

// Expose globally so existing components using `window.api.xxx` keep working unchanged
if (typeof window !== 'undefined') {
  window.api = api
}
