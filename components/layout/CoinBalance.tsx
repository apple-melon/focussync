'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  initialCoins: number
}

export function CoinBalance({ userId, initialCoins }: Props) {
  const [coins, setCoins] = useState(initialCoins)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`coin_balance:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'coin_logs', filter: `user_id=eq.${userId}` },
        async () => {
          const { data } = await supabase
            .from('users')
            .select('coins')
            .eq('id', userId)
            .single()
          if (data) setCoins(data.coins)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <div className="flex items-center gap-1.5 mt-2 px-0.5">
      <span className="text-base leading-none">💰</span>
      <span className="text-sm font-bold text-yellow-400">{coins.toLocaleString()}</span>
      <span className="text-xs text-slate-500">코인</span>
    </div>
  )
}
