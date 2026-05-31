import { NextResponse } from 'next/server'
import { cancelPost } from '@/lib/store'

export async function POST(_, { params }) {
  const { id } = await params
  await cancelPost(id)
  return NextResponse.json({ success: true })
}
