import { NextResponse } from 'next/server'
import { getUsers } from '@/lib/store'
import { getLegacyPassword } from '@/lib/auth'

export async function GET() {
  const users = await getUsers()
  // setupNeeded only if no users AND no legacy password to migrate from
  const setupNeeded = users.length === 0 && !getLegacyPassword()
  return NextResponse.json({ setupNeeded })
}
