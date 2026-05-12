'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const RARITY_COLOR: Record<string, string> = {
  common: '#94A3B8',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#EAB308',
}

const GOAL_PRESETS = [60, 120, 180, 240, 360, 480]

interface Achievement {
  icon: string
  name: string
  rarity: string
  description: string
  xp_reward: number
  earned_at: string
}

interface Session {
  started_at: string
  focus_minutes: number
  room_name: string | null
}

interface Props {
  userId: string
  displayName: string
  avatarUrl: string | null
  level: number
  xpCurrent: number
  xpRequired: number
  xpPct: number
  tierColor: string
  tierGradient: string
  tierName: string
  totalFocusMinutes: number
  streakDays: number
  studyDays: number
  dailyGoalMinutes: number
  todayMinutes: number
  achievements: Achievement[]
  sessions: Session[]
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  return `${diff}일 전`
}

export function ProfileClient({
  userId, displayName, avatarUrl, level,
  xpCurrent, xpRequired, xpPct, tierColor, tierGradient, tierName,
  totalFocusMinutes, streakDays, studyDays,
  dailyGoalMinutes, todayMinutes, achievements, sessions,
}: Props) {
  const [name, setName] = useState(displayName)
  const [editingName, setEditingName] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)

  const [goal, setGoal] = useState(dailyGoalMinutes)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalSaving, setGoalSaving] = useState(false)

  const goalPct = Math.min(100, Math.round((todayMinutes / goal) * 100))
  const totalH = Math.floor(totalFocusMinutes / 60)
  const totalM = totalFocusMinutes % 60
  const goalH = Math.floor(goal / 60)
  const remainMins = Math.max(0, goal - todayMinutes)

  async function saveName() {
    setNameSaving(true)
    const supabase = createClient()
    await supabase.from('users').update({ display_name: name }).eq('id', userId)
    setNameSaving(false)
    setEditingName(false)
  }

  async function saveGoal() {
    setGoalSaving(true)
    const supabase = createClient()
    await supabase.from('users').update({ daily_goal_minutes: goal }).eq('id', userId)
    setGoalSaving(false)
    setEditingGoal(false)
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      {/* Profile card */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 overflow-hidden"
              style={{ background: `${tierColor}22`, border: `2.5px solid ${tierColor}55` }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                : <span style={{ color: tierColor }}>{name[0]?.toUpperCase()}</span>}
            </div>

            <div className="space-y-1.5">
              {/* Inline name edit */}
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') { setEditingName(false); setName(displayName) }
                    }}
                    className="bg-[#0D0F14] border border-[#6366F1]/50 rounded-lg px-3 py-1 text-white text-lg font-bold focus:outline-none w-44"
                    autoFocus
                  />
                  <button
                    onClick={saveName}
                    disabled={nameSaving}
                    className="text-xs bg-[#6366F1] px-2.5 py-1 rounded-lg text-white font-semibold disabled:opacity-60"
                  >
                    {nameSaving ? '...' : '저장'}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setName(displayName) }}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1.5 group"
                >
                  <h2 className="text-xl font-bold text-white">{name}</h2>
                  <span className="text-slate-600 group-hover:text-slate-400 transition-colors">✏️</span>
                </button>
              )}
              <p className="text-sm font-semibold" style={{ color: tierColor }}>Lv.{level} {tierName}</p>
            </div>
          </div>

          <Link
            href="/settings"
            className="text-xs bg-[#242E42] hover:bg-[#2d3748] text-slate-300 px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            설정 →
          </Link>
        </div>

        {/* XP bar */}
        <div className="space-y-1.5 mb-5">
          <div className="h-2 bg-[#0D0F14] rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${tierGradient} rounded-full transition-all duration-700`}
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right font-mono">
            {xpCurrent.toLocaleString()} / {xpRequired.toLocaleString()} XP
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0D0F14] rounded-xl p-3 text-center border border-white/5">
            <p className="text-lg font-bold text-white font-mono">{totalH}h {totalM > 0 ? `${totalM}m` : ''}</p>
            <p className="text-xs text-slate-500 mt-0.5">총 집중 시간</p>
          </div>
          <div className="bg-[#0D0F14] rounded-xl p-3 text-center border border-white/5">
            <p className="text-lg font-bold text-white font-mono">🔥 {streakDays}일</p>
            <p className="text-xs text-slate-500 mt-0.5">연속 집중</p>
          </div>
          <div className="bg-[#0D0F14] rounded-xl p-3 text-center border border-white/5">
            <p className="text-lg font-bold text-white font-mono">{studyDays}개</p>
            <p className="text-xs text-slate-500 mt-0.5">완료한 목표</p>
          </div>
        </div>
      </div>

      {/* Goal setting */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">오늘의 목표</h3>
          <button
            onClick={() => setEditingGoal(!editingGoal)}
            className="text-xs text-[#6366F1] hover:underline"
          >
            {editingGoal ? '취소' : '목표 수정'}
          </button>
        </div>

        {editingGoal ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">일일 집중 목표 시간 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_PRESETS.map((p) => (
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
              disabled={goalSaving}
              className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {goalSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">
                {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m 집중
              </span>
              <span className="text-slate-500">목표 {goalH}h</span>
            </div>
            <div className="h-3 bg-[#0D0F14] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  goalPct >= 100
                    ? 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                    : 'bg-gradient-to-r from-[#6366F1] to-[#A855F7]'
                }`}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              {goalPct >= 100 ? (
                <p className="text-sm text-[#22C55E] font-semibold">🎉 오늘 목표 달성!</p>
              ) : (
                <p className="text-xs text-slate-500">
                  목표까지 {Math.floor(remainMins / 60) > 0 ? `${Math.floor(remainMins / 60)}시간 ` : ''}
                  {remainMins % 60}분 남았어요
                </p>
              )}
              <span className={`text-2xl font-bold ${goalPct >= 100 ? 'text-[#22C55E]' : 'text-white'}`}>
                {goalPct}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">최근 업적</h3>
          <span className="text-xs text-slate-500">{achievements.length}개 달성</span>
        </div>

        {achievements.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {achievements.map((ach, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 group cursor-default" title={ach.description}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 group-hover:shadow-lg"
                  style={{
                    background: `${RARITY_COLOR[ach.rarity] ?? '#94A3B8'}18`,
                    border: `1.5px solid ${RARITY_COLOR[ach.rarity] ?? '#94A3B8'}44`,
                  }}
                >
                  {ach.icon}
                </div>
                <p className="text-[10px] text-slate-400 text-center leading-tight w-full truncate font-medium px-0.5">
                  {ach.name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm">공부하면 업적이 쌓여요!</p>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">최근 활동</h3>
        {sessions.length > 0 ? (
          <div>
            {sessions.map((s, i) => {
              const h = Math.floor(s.focus_minutes / 60)
              const m = s.focus_minutes % 60
              const durationStr = h > 0 ? `${h}시간${m > 0 ? ` ${m}분` : ''}` : `${m}분`
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center text-sm flex-shrink-0">
                      📚
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        {s.room_name ?? '개인 집중'}에서 {durationStr} 집중
                      </p>
                      <p className="text-xs text-slate-500">{relativeTime(s.started_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#6366F1] flex-shrink-0">
                    +{Math.round(s.focus_minutes * 1.5)} XP
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-3xl mb-2">📖</p>
            <p className="text-sm">아직 공부 기록이 없어요.</p>
          </div>
        )}
      </div>
    </div>
  )
}
