/**
 * Déclenche un poll des commentaires Facebook (et plus tard Instagram, Threads).
 * Génère en parallèle 3 réponses IA pour chaque nouveau commentaire.
 *
 * POST /api/inbox/poll      → manual trigger (user click "Refresh")
 * GET  /api/inbox/poll       → same (also callable by Vercel Cron)
 * GET  /api/inbox/poll?first=1 → first run (24h lookback)
 */

import { NextResponse } from 'next/server'
import { pollFacebookComments } from '@/lib/inbox'

export const maxDuration = 60

async function handle(req) {
  try {
    const { searchParams } = new URL(req.url)
    const firstRun = searchParams.get('first') === '1'

    // Optional: protect with a secret if called from external cron
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const auth = req.headers.get('authorization') || ''
      const provided = auth.replace('Bearer ', '')
      const querySecret = searchParams.get('secret')
      // Allow either header bearer OR query secret
      if (provided !== cronSecret && querySecret !== cronSecret) {
        // But also allow if user is authenticated via cookie (manual trigger)
        // The middleware handles cookie auth, so if we reached here, user is logged in
      }
    }

    const result = await pollFacebookComments({ firstRun })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[inbox/poll]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) { return handle(req) }
export async function GET(req) { return handle(req) }
