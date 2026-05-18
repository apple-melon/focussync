import { createClient } from '@/lib/supabase/client'
import type { ShopItem, OwnedItem, PurchaseResult } from '@/types/shop.types'

export async function getShopItems(): Promise<ShopItem[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shop_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return (data ?? []) as ShopItem[]
}

export async function getUserItems(userId: string): Promise<OwnedItem[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('user_items')
    .select('id, item_id, purchased_at, expires_at, is_active, item:shop_items(key)')
    .eq('user_id', userId)
    .eq('is_active', true)
  return (data ?? []) as unknown as OwnedItem[]
}

export async function purchaseItem(itemKey: string): Promise<PurchaseResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('purchase_item', { p_item_key: itemKey })
  if (error) return { success: false, error: error.message }
  return data as PurchaseResult
}
