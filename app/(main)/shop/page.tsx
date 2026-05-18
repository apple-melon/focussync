import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ShopClient } from '@/components/shop/ShopClient'
import type { ShopItem, OwnedItem } from '@/types/shop.types'

export const metadata: Metadata = { title: '상점' }

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, itemsRes, userItemsRes] = await Promise.all([
    supabase
      .from('users')
      .select('coins, streak_shield, xp_boost_until, coin_boost_until')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('shop_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('user_items')
      .select('id, item_id, purchased_at, expires_at, is_active, item:shop_items(key)')
      .eq('user_id', user!.id)
      .eq('is_active', true),
  ])

  return (
    <ShopClient
      userId={user!.id}
      coins={profileRes.data?.coins ?? 0}
      streakShields={profileRes.data?.streak_shield ?? 0}
      xpBoostUntil={profileRes.data?.xp_boost_until ?? null}
      coinBoostUntil={profileRes.data?.coin_boost_until ?? null}
      items={(itemsRes.data ?? []) as ShopItem[]}
      ownedItems={(userItemsRes.data ?? []) as unknown as OwnedItem[]}
    />
  )
}
