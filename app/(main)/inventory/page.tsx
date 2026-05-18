import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { InventoryClient } from '@/components/shop/InventoryClient'
import type { ShopItem } from '@/types/shop.types'

export const metadata: Metadata = { title: '인벤토리' }

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, userItemsRes] = await Promise.all([
    supabase
      .from('users')
      .select('streak_shield, xp_boost_until, coin_boost_until, active_skin')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('user_items')
      .select('id, item_id, purchased_at, item:shop_items(id, key, name, description, icon, price, category, duration_hours, sort_order, is_active)')
      .eq('user_id', user!.id)
      .eq('is_active', true),
  ])

  // Extract owned cosmetic skins only
  const ownedSkins = (userItemsRes.data ?? [])
    .map((ui) => {
      const item = Array.isArray(ui.item) ? ui.item[0] : ui.item
      if (!item || item.category !== 'cosmetic') return null
      return { ...item, purchasedAt: ui.purchased_at } as ShopItem & { purchasedAt: string }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    // Deduplicate by key (keep first occurrence)
    .filter((s, i, arr) => arr.findIndex((x) => x.key === s.key) === i)

  return (
    <InventoryClient
      userId={user!.id}
      streakShields={profileRes.data?.streak_shield ?? 0}
      xpBoostUntil={profileRes.data?.xp_boost_until ?? null}
      coinBoostUntil={profileRes.data?.coin_boost_until ?? null}
      activeSkin={profileRes.data?.active_skin ?? 'default'}
      ownedSkins={ownedSkins}
    />
  )
}
