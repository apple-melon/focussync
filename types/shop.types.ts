export interface ShopItem {
  id: string
  key: string
  name: string
  description: string
  icon: string
  price: number
  category: 'consumable' | 'cosmetic'
  duration_hours: number | null
  sort_order: number
  is_active: boolean
}

export interface OwnedItem {
  id: string
  item_id: string
  purchased_at: string
  expires_at: string | null
  is_active: boolean
  item: { key: string } | { key: string }[] | null
}

export interface PurchaseResult {
  success: boolean
  error?: string
  item_id?: string
  remaining_coins?: number
}
