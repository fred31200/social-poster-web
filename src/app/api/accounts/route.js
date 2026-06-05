import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getAccounts } from '@/lib/store'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(await getAccounts(auth.userId))
}
