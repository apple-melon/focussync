'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StreakState {
  streakDays: number
  lastStudyDate: string | null
  isAtRisk: boolean
  loading: boolean
}

export function useStreak(userId: string | null) {
  const [state, setState] = useState<StreakState>({
    streakDays: 0, lastStudyDate: null, isAtRisk: false, loading: true,
  })

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    supabase
      .from('users')
      .select('streak_days, last_study_date')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const lastDate = data.last_study_date
        let isAtRisk = false
        if (lastDate) {
          const last = new Date(lastDate)
          const today = new Date()
          const diffDays = Math.floor(
            (today.setHours(0, 0, 0, 0) - last.setHours(0, 0, 0, 0)) / 86400000,
          )
          isAtRisk = diffDays >= 1 && today.getHours() >= 20
        }
        setState({
          streakDays: data.streak_days,
          lastStudyDate: lastDate,
          isAtRisk,
          loading: false,
        })
      })
  }, [userId])

  return state
}
