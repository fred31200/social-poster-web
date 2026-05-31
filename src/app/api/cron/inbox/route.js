/**
 * Cron endpoint — hit by Vercel Cron every hour (Hobby plan compatible).
 * Public route protected by CRON_SECRET env var (set by Vercel) or query secret.
 *
 * Schedule defined in vercel.json: "0 * * * *" (every hour, on the hour)
 */

import { NextResponse } from 'next/server'
import { pollFacebookComments } from '@/lib/inbox'

export const maxDuration = 60

export async function GET(req) {
  // Vercel adds Authorization: Bearer <CRON_SECRET> automatically when env is set
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') || ''
    const bearer = auth.replace(/^Bearer\s+/i, '')
    const { searchParams } = new URL(req.url)
    const querySecret = searchParams.get('secret')
    if (bearer !== cronSecret && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  // If CRON_SECRET not set, allow (less secure but functional — user warned in setup docs)

  try {
    const result = await pollFacebookComments({ firstRun: false })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[cron/inbox]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
