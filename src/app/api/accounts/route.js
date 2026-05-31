import { NextResponse } from 'next/server'
import { getAccounts } from '@/lib/store'

export async function GET() {
  return NextResponse.json(await getAccounts())
}
