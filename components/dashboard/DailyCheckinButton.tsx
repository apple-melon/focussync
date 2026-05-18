'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  streakDays: number
  alreadyCheckedIn: boolean
}

export function DailyCheckinButton({ userId, streakDays, alreadyCheckedIn: initial }: Props) {
  const [checked, setChecked] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ streak: number; coins: number } | null>(null)
  const [currentStreak, setCurrentStreak] = useState(streakDays)

  async function handleCheckin() {
    if (checked || loading) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.rpc('daily_checkin', { p_user_id: userId })
    setLoading(false)
    if (data) {
      setChecked(true)
      setCurrentStreak(data.streak_days)
      setResult({ streak: data.streak_days, coins: data.coins })
    }
  }

  if (checked) {
    return (
      <div className="bg-[#161B22] border border-green-500/20 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
          ✅
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">오늘 출석 완료!</p>
          <p className="text-xs text-green-400 mt-0.5">
            🔥 {currentStreak}일 연속 달성
            {result && <span className="text-yellow-400 ml-2">💰 +10 코인</span>}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#161B22] border border-[#6366F1]/20 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
        📅
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">오늘 출석 체크하기</p>
        <p className="text-xs text-slate-500 mt-0.5">
          🔥 현재 {currentStreak}일 연속 &nbsp;·&nbsp; 💰 +10 코인
        </p>
      </div>
      <button
        onClick={handleCheckin}
        disabled={loading}
        className="flex-shrink-0 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)]"
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : '출석'}
      </button>
    </div>
  )
}
