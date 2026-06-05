import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { deleteAccount } from '@/lib/store'

export async function DELETE(req, { params }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  await deleteAccount(auth.userId, id)
  return NextResponse.json({ success: true })
}
