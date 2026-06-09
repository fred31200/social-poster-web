/**
 * Google Business Profile (fiche d'établissement Google) — OAuth + publication.
 *
 * APIs utilisées :
 *  - OAuth2 Google (scope business.manage, access_type=offline → refresh_token)
 *  - Account Management v1  : lister les comptes GBP
 *  - Business Information v1: lister les établissements (locations)
 *  - My Business v4 (legacy): créer les posts (localPosts) — verrouillée tant que
 *    Google n'a pas approuvé la demande d'accès (n° 5-3356000041612) → 403.
 *
 * Env: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (Vercel).
 */

import axios from 'axios'

const SCOPE = 'https://www.googleapis.com/auth/business.manage'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ACCT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const V4_API = 'https://mybusiness.googleapis.com/v4'

const FRIENDLY_403 = 'Accès API Google pas encore approuvé (demande en cours d\'examen chez Google, 7-10 jours ouvrés). Réessaie après l\'email d\'approbation.'

export function buildGoogleOAuthURL({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline', // → refresh_token (indispensable pour les posts planifiés)
    prompt: 'consent',      // force la ré-émission du refresh_token
    state,
  })
  return `${AUTH_URL}?${params}`
}

export async function exchangeGoogleCode({ code, redirectUri, clientId, clientSecret }) {
  const r = await axios.post(TOKEN_URL, new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: redirectUri, grant_type: 'authorization_code',
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  return r.data // { access_token, refresh_token, expires_in, ... }
}

export async function refreshGoogleToken({ refreshToken, clientId, clientSecret }) {
  const r = await axios.post(TOKEN_URL, new URLSearchParams({
    refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret,
    grant_type: 'refresh_token',
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  return r.data.access_token
}

function rethrow(e) {
  const status = e.response?.status
  const msg = e.response?.data?.error?.message || e.message
  if (status === 403 || status === 429) throw new Error(FRIENDLY_403)
  throw new Error('Google: ' + msg)
}

/** Récupère le 1er établissement de l'utilisateur (compte + location + nom). */
export async function getGoogleLocation(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` }
  try {
    const accounts = await axios.get(`${ACCT_API}/accounts`, { headers })
    const account = accounts.data.accounts?.[0]
    if (!account) throw new Error('Aucun compte Fiche Google sur ce compte — connecte-toi avec le compte propriétaire de la fiche.')
    const locs = await axios.get(`${INFO_API}/${account.name}/locations`, {
      headers, params: { readMask: 'name,title', pageSize: 10 },
    })
    const location = locs.data.locations?.[0]
    if (!location) throw new Error('Aucun établissement trouvé sur ce compte Google.')
    // account.name = "accounts/123", location.name = "locations/456"
    return { accountName: account.name, locationName: location.name, title: location.title }
  } catch (e) {
    if (e.response) rethrow(e)
    throw e
  }
}

/**
 * Publie un post sur la fiche (v4 localPosts).
 * account: { access_token, refresh_token, page_id: "accounts/123/locations/456", ... }
 * mediaPaths: URLs publiques (le flux média de l'app héberge déjà les images en URL).
 */
export async function postToGoogle(account, content, mediaPaths = []) {
  const { getConfig } = await import('@/lib/config')
  const config = getConfig()
  // Les access tokens Google expirent en ~1h → on rafraîchit systématiquement.
  let token = account.access_token
  if (account.refresh_token) {
    try {
      token = await refreshGoogleToken({
        refreshToken: account.refresh_token,
        clientId: config.google_client_id,
        clientSecret: config.google_client_secret,
      })
    } catch { /* on tente avec le token stocké */ }
  }

  const body = {
    languageCode: 'fr',
    topicType: 'STANDARD',
    summary: (content || '').slice(0, 1500), // limite GBP
  }
  const photo = (mediaPaths || []).find(p => /^https?:\/\//i.test(p))
  if (photo) body.media = [{ mediaFormat: 'PHOTO', sourceUrl: photo }]

  try {
    const r = await axios.post(`${V4_API}/${account.page_id}/localPosts`, body, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return r.data.name // ex: accounts/x/locations/y/localPosts/z
  } catch (e) {
    if (e.response) rethrow(e)
    throw e
  }
}
