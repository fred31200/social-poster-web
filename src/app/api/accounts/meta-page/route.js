import { NextResponse } from 'next/server'
import { saveAccount } from '@/lib/store'

export async function POST(req) {
  try {
    const { page } = await req.json()
    if (!page) return NextResponse.json({ error: 'page manquante' }, { status: 400 })

    const fbId = await saveAccount({
      platform: 'facebook',
      name: page.name,
      platform_user_id: page.id,
      page_id: page.id,
      page_name: page.name,
      access_token: page.access_token,
      avatar: null,
    })

    if (page.instagram_business_account) {
      const igId = await saveAccount({
        platform: 'instagram',
        name: page.instagram_business_account.username || page.name,
        username: page.instagram_business_account.username,
        platform_user_id: page.instagram_business_account.id,
        page_id: page.id,
        instagram_account_id: page.instagram_business_account.id,
        access_token: page.access_token,
        avatar: page.instagram_business_account.profile_picture_url,
      })
      return NextResponse.json({ success: true, facebookId: fbId, instagramId: igId })
    }
    return NextResponse.json({ success: true, id: fbId })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
