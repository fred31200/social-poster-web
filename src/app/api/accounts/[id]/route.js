import { NextResponse } from 'next/server'
import { deleteAccount } from '@/lib/store'

export async function DELETE(_, { params }) {
  const { id } = await params
  await deleteAccount(id)
  return NextResponse.json({ success: true })
}
