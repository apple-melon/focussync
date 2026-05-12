'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLevelTier } from '@/lib/xp/formulas'

type Period = 'daily' | 'weekly' | 'all_time'
const PERIOD_LABELS: Record<Period, string> = { daily: '일간', weekly: '주간', all_time: '전체' }

interface RankUser {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  xp: number
  level: number
  streak_days: number
}

const MEDAL = ['🥇', '🥈', '🥉']
const PODIUM_H = ['h-28', 'h-36', 'h-24']
const PODIUM_ORDER = [1, 0, 2]

export default function RankingPage() {
  const [period, setPeriod] = useState<Period>('weekly')
  const [rankings, setRankings] = useState<RankUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('users')
      .select('id, display_name, avatar_url, xp, level, streak_days')
      .order('xp', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const list = (data ?? []).map((u, i) => ({
          rank: i + 1,
          user_id: u.id,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          xp: u.xp,
          level: u.level,
          streak_days: u.streak_days,
        }))
        setRankings(list)
        setLoading(false)
      })
  }, [period])

  const top3 = rankings.slice(0, 3)
  const rest = rankings.slice(3)

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">랭킹</h1>
        {/* Period tabs */}
        <div className="flex bg-[#161B22] border border-white/10 rounded-xl p-1 gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p ? 'bg-[#6366F1] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#161B22] rounded-2xl animate-pulse border border-white/10" />
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🏆</p>
          <p>아직 랭킹 데이터가 없어요.</p>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {top3.length >= 3 && (
            <div className="bg-[#161B22] border border-white/10 rounded-2xl p-6">
              <div className="flex items-end justify-center gap-4">
                {PODIUM_ORDER.map((rankIdx) => {
                  const u = top3[rankIdx]
                  if (!u) return null
                  const tier = getLevelTier(u.level)
                  const isFirst = rankIdx === 0
                  return (
                    <div key={u.user_id} className="flex flex-col items-center gap-2">
                      {isFirst && <span className="text-2xl animate-bounce">👑</span>}
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 overflow-hidden"
                        style={{ borderColor: tier.color, background: `${tier.color}22` }}
                      >
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                          : <span style={{ color: tier.color }}>{u.display_name[0]?.toUpperCase()}</span>}
                      </div>
                      <p className="text-xs font-semibold text-white text-center max-w-16 truncate">{u.display_name}</p>
                      <p className="text-xs font-mono text-slate-400">{u.xp.toLocaleString()} XP</p>
                      <div
                        className={`w-20 ${PODIUM_H[rankIdx]} rounded-t-xl flex items-center justify-center text-2xl`}
                        style={{ background: rankIdx === 0 ? '#EAB30830' : rankIdx === 1 ? '#94A3B830' : '#CD7F3230' }}
                      >
                        {MEDAL[rankIdx]}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rest of rankings */}
          <div className="space-y-2">
            {(top3.length < 3 ? rankings : rest).map((u) => {
              const tier = getLevelTier(u.level)
              return (
                <div key={u.user_id} className="flex items-center gap-4 bg-[#161B22] border border-white/10 rounded-xl px-4 py-3 hover:bg-[#1C2333] transition-colors">
                  <span className="w-6 text-center font-mono text-sm font-bold text-slate-500">{u.rank}</span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
                    style={{ background: `${tier.color}22`, border: `1.5px solid ${tier.color}55` }}
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                      : <span style={{ color: tier.color }}>{u.display_name[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.display_name}</p>
                    <p className="text-xs" style={{ color: tier.color }}>Lv.{u.level} {tier.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white font-mono">{u.xp.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
