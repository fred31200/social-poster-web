import { NextResponse } from 'next/server'
import { getConfig, saveConfig } from '@/lib/config'

export async function GET() {
  return NextResponse.json(getConfig())
}

export async function POST(req) {
  const body = await req.json()
  return NextResponse.json(saveConfig(body))
}
