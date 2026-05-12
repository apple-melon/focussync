'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { levelProgress } from '@/lib/xp/formulas'

interface XPState {
  xp: number
  level: number
  current: number
  required: number
  pct: number
  loading: boolean
}

export function useXP(userId: string | null) {
  const [state, setState] = useState<XPState>({
    xp: 0, level: 1, current: 0, required: 100, pct: 0, loading: true,
  })

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    supabase
      .from('users')
      .select('xp')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const progress = levelProgress(data.xp)
        setState({ ...progress, xp: data.xp, loading: false })
      })
  }, [userId])

  const awardSessionXP = useCallback(async (
    focusMinutes: number,
    sessionId: string,
  ) => {
    if (!userId || focusMinutes < 1) return null

    const res = await fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, focusMinutes, sessionId }),
    })

    if (!res.ok) return null
    const { xp, level, current, required, pct, newAchievements } = await res.json()
    setState({ xp, level, current, required, pct, loading: false })
    return { xp, level, newAchievements }
  }, [userId])

  return { ...state, awardSessionXP }
}
