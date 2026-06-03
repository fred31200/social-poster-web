/**
 * Proxy pour télécharger des images Pollinations.ai via Vercel.
 * Évite les soucis CORS / timeout côté navigateur.
 *
 * GET /api/ai/image/proxy?url=<URL Pollinations URL-encoded>
 */

export const maxDuration = 60

const ALLOWED_HOSTS = new Set([
  'loremflickr.com',        // source par défaut (sans clé)
  'images.pexels.com',      // source Pexels (si PEXELS_API_KEY)
  'image.pollinations.ai',  // ancienne source (conservée par compat)
  '0x0.st',                 // hôte public (images générées hébergées à l'upload)
])
// Hôtes publics qui utilisent plusieurs sous-domaines (a./d./o.uguu.se, files.catbox.moe…)
const ALLOWED_SUFFIXES = ['.uguu.se', '.catbox.moe']

function hostAllowed(host) {
  return ALLOWED_HOSTS.has(host) || ALLOWED_SUFFIXES.some(s => host.endsWith(s))
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const target = searchParams.get('url')
    if (!target) {
      return new Response('Missing url param', { status: 400 })
    }

    // Whitelist d'hôtes (exact + suffixes pour les hôtes multi-sous-domaines)
    let targetUrl
    try { targetUrl = new URL(target) } catch { return new Response('Invalid URL', { status: 400 }) }
    if (!hostAllowed(targetUrl.host)) {
      return new Response('Host not allowed', { status: 403 })
    }

    // Fetch with 55s timeout (Vercel max is 60s)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55_000)

    let r
    try {
      r = await fetch(target, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SocialPosterBiz/1.0' },
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!r.ok) {
      return new Response(`Upstream error ${r.status}`, { status: 502 })
    }

    // Stream the response back to the browser
    const contentType = r.headers.get('content-type') || 'image/jpeg'
    return new Response(r.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      return new Response('Pollinations timeout (>55s)', { status: 504 })
    }
    return new Response(err.message || 'Proxy error', { status: 500 })
  }
}
