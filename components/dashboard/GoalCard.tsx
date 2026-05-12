'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  dailyGoalMinutes: number
  todayMinutes: number
  onUpdated?: (newGoal: number) => void
}

export function GoalCard({ userId, dailyGoalMinutes, todayMinutes, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [goal, setGoal] = useState(dailyGoalMinutes)
  const [saving, setSaving] = useState(false)

  const pct = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))
  const remaining = Math.max(0, dailyGoalMinutes - todayMinutes)
  const remainingH = Math.floor(remaining / 60)
  const remainingM = remaining % 60

  const presets = [60, 120, 180, 240, 360, 480]

  async function saveGoal() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('users').update({ daily_goal_minutes: goal }).eq('id', userId)
    setSaving(false)
    setEditing(false)
    onUpdated?.(goal)
  }

  return (
    <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">오늘의 목표</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-[#6366F1] hover:underline"
        >
          {editing ? '취소' : '목표 수정'}
        </button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">일일 집중 목표 시간 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setGoal(p)}
                className={`py-2 rounded-xl text-sm font-semibold transition-all border ${
                  goal === p
                    ? 'bg-[#6366F1]/20 border-[#6366F1]/40 text-[#6366F1]'
                    : 'bg-[#0D0F14] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {p >= 60 ? `${p / 60}h` : `${p}m`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={15} max={720} value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-24 bg-[#0D0F14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6366F1]"
            />
            <span className="text-xs text-slate-400">분 직접 입력</span>
          </div>
          <button
            onClick={saveGoal}
            disabled={saving}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m 집중</span>
              <span className="text-slate-500">목표 {Math.floor(dailyGoalMinutes / 60)}h</span>
            </div>
            <div className="h-3 bg-[#0D0F14] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gradient-to-r from-[#6366F1] to-[#A855F7]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {pct >= 100 ? (
            <p className="text-sm text-[#22C55E] font-semibold text-center">🎉 오늘 목표 달성!</p>
          ) : (
            <p className="text-xs text-slate-500 text-center">
              목표까지 {remainingH > 0 ? `${remainingH}시간 ` : ''}{remainingM}분 남았어요
            </p>
          )}

          <div className="text-center">
            <span className={`text-2xl font-bold ${pct >= 100 ? 'text-[#22C55E]' : 'text-white'}`}>{pct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
