import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getUsers, getPosts, getAccounts } from '@/lib/store'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  if (!auth.user.isAdmin) return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })

  const users = await getUsers()
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

  let totalPosts = 0, postsThisWeek = 0, totalAccounts = 0, usersWithAccounts = 0

  await Promise.all(users.map(async (user) => {
    const [posts, accounts] = await Promise.all([
      getPosts(user.id, 1000).catch(() => []),
      getAccounts(user.id).catch(() => []),
    ])
    const published = posts.filter(p => p.status === 'published' || p.status === 'partial')
    totalPosts += published.length
    postsThisWeek += published.filter(p => p.created_at >= weekAgo).length
    totalAccounts += accounts.length
    if (accounts.length > 0) usersWithAccounts++
  }))

  return NextResponse.json({
    users: {
      total: users.length,
      active: users.filter(u => u.isActive !== false).length,
      disabled: users.filter(u => u.isActive === false).length,
      admins: users.filter(u => u.isAdmin).length,
      withAccounts: usersWithAccounts,
      withOwnKey: users.filter(u => u.anthropicKey).length,
      aiEnabled: users.filter(u => u.aiEnabled).length,
    },
    posts: { total: totalPosts, thisWeek: postsThisWeek },
    accounts: { total: totalAccounts },
  })
}
