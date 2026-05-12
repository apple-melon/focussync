import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPublicRooms } from '@/services/room.service'
import { levelProgress, getLevelTier } from '@/lib/xp/formulas'

const ROOM_GRADIENTS = [
  'from-indigo-900 via-purple-900 to-slate-900',
  'from-slate-900 via-blue-900 to-indigo-900',
  'from-purple-900 via-slate-900 to-blue-900',
  'from-blue-900 via-indigo-900 to-purple-900',
]

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일']

function WeeklyChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const w = 100 / (data.length - 1)
  const pts = data.map((v, i) => ({ x: i * w, y: 90 - (v / max) * 75 }))
  const d = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
  const fill = `${d} L${pts[pts.length - 1].x},100 L0,100 Z`

  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-28">
        <defs>
          <linearGradient id="cg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#cg)" />
        <path d={d} fill="none" stroke="#6366F1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#6366F1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex justify-between px-0.5 mt-1">
        {WEEK_DAYS.map((d) => (
          <span key={d} className="text-xs text-slate-600">{d}</span>
        ))}
      </div>
    </div>
  )
}

function GoalRing({ pct, goalMins, todayMins }: { pct: number; goalMins: number; todayMins: number }) {
  const r = 44, c = 2 * Math.PI * r
  const done = pct >= 100
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <svg width={120} height={120} className="-rotate-90">
          <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
          <circle
            cx={60} cy={60} r={r} fill="none"
            stroke={done ? '#22C55E' : '#6366F1'}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(pct, 100) / 100)}
            style={{ filter: `drop-shadow(0 0 8px ${done ? 'rgba(34,197,94,0.6)' : 'rgba(99,102,241,0.6)'})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${done ? 'text-[#22C55E]' : 'text-white'}`}>{pct}%</span>
          <span className="text-xs text-slate-500 mt-0.5">달성률</span>
        </div>
      </div>
      {done ? (
        <p className="text-xs text-[#22C55E] font-semibold">🎉 목표 달성!</p>
      ) : (
        <p className="text-xs text-slate-500">
          {Math.floor(todayMins / 60)}h {todayMins % 60}m / {Math.floor(goalMins / 60)}h 목표
        </p>
      )}
      <Link href="/profile" className="text-xs text-[#6366F1] hover:underline font-medium">
        목표 설정 →
      </Link>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, xp, streak_days, total_focus_minutes, last_study_date, daily_goal_minutes')
    .eq('id', user!.id)
    .single()

  const { data: recentAchievements } = await supabase
    .from('user_achievements')
    .select('earned_at, achievement:achievement_definitions(name, icon, xp_reward)')
    .eq('user_id', user!.id)
    .order('earned_at', { ascending: false })
    .limit(3)

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('started_at, focus_minutes')
    .eq('user_id', user!.id)
    .gte('started_at', weekAgo)

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toISOString().slice(0, 10)
    return (sessions ?? [])
      .filter((s) => s.started_at?.startsWith(dayStr))
      .reduce((sum, s) => sum + (s.focus_minutes ?? 0), 0)
  })

  const publicRooms = await getPublicRooms(4)
  const xp = profile?.xp ?? 0
  const progress = levelProgress(xp)
  const tier = getLevelTier(progress.level)
  const totalHours = Math.floor((profile?.total_focus_minutes ?? 0) / 60)
  const totalMins = (profile?.total_focus_minutes ?? 0) % 60
  const todayMins = weeklyData[6]
  const goalMins = profile?.daily_goal_minutes ?? 360
  const goalPct = Math.min(100, Math.round((todayMins / goalMins) * 100))
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User'

  const STAT_CARDS = [
    {
      icon: '⏱', label: '오늘 집중 시간',
      value: `${Math.floor(todayMins / 60)}h ${todayMins % 60}m`,
      sub: `목표 ${Math.floor(goalMins / 60)}시간`,
      color: '#6366F1', bg: '#6366F115',
    },
    {
      icon: '🔥', label: '연속 집중',
      value: `${profile?.streak_days ?? 0}일`,
      sub: '계속 유지하세요!',
      color: '#22C55E', bg: '#22C55E15',
    },
    {
      icon: '👑', label: '레벨',
      value: `Lv.${progress.level}`,
      sub: `다음까지 ${(progress.required - progress.current).toLocaleString()} XP`,
      color: tier.color, bg: `${tier.color}15`,
    },
    {
      icon: '⭐', label: '총 집중 시간',
      value: `${totalHours}h ${totalMins}m`,
      sub: '누적 기록',
      color: '#EAB308', bg: '#EAB30815',
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">안녕하세요, <span className="text-white font-semibold">{displayName}</span>님! 👋</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">오늘도 집중해서 목표를 달성해봐요!</h1>
        </div>
        <Link
          href="/room/create"
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105"
        >
          🚪 집중방 만들기
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="bg-[#161B22] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: card.bg }}>
                {card.icon}
              </div>
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{card.value}</p>
            <p className="text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Goal + Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly chart */}
        <div className="lg:col-span-1 bg-[#161B22] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">집중 시간 추이 (주간)</h3>
          <WeeklyChart data={weeklyData} />
        </div>

        {/* Goal ring */}
        <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-1">
          <h3 className="text-sm font-semibold text-white self-start mb-2">목표 달성률</h3>
          <GoalRing pct={goalPct} goalMins={goalMins} todayMins={todayMins} />
        </div>

        {/* Recent achievements */}
        <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">최근 업적</h3>
            <Link href="/profile" className="text-xs text-[#6366F1] hover:underline">모두 보기 →</Link>
          </div>
          {recentAchievements && recentAchievements.length > 0 ? (
            <div className="space-y-3">
              {recentAchievements.map((ua, i) => {
                const ach = (Array.isArray(ua.achievement) ? ua.achievement[0] : ua.achievement) as { name: string; icon: string; xp_reward: number } | null
                if (!ach) return null
                const diff = Math.floor((Date.now() - new Date(ua.earned_at).getTime()) / 86400000)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-xl flex-shrink-0">
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{ach.name}</p>
                      <p className="text-xs text-[#6366F1]">+{ach.xp_reward} XP</p>
                    </div>
                    <span className="text-xs text-slate-600 flex-shrink-0">
                      {diff === 0 ? '오늘' : diff === 1 ? '어제' : `${diff}일 전`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-slate-600 text-sm">
              <p className="text-2xl mb-1">🎯</p>
              <p>공부하면 업적이 쌓여요!</p>
            </div>
          )}
        </div>
      </div>

      {/* Active rooms */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">참여 중인 집중방</h3>
          <Link href="/rooms" className="text-xs text-[#6366F1] hover:underline">더 보기 →</Link>
        </div>
        {publicRooms.length === 0 ? (
          <div className="bg-[#161B22] border border-white/10 rounded-2xl p-8 text-center text-slate-500">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm">공개 집중방이 없어요.</p>
            <Link href="/room/create" className="text-sm text-[#6366F1] hover:underline mt-2 inline-block">
              첫 번째로 만들어보세요 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {publicRooms.map((room, idx) => (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-[#6366F1]/40 transition-all hover:scale-[1.02]"
                style={{ aspectRatio: '4/3' }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${ROOM_GRADIENTS[idx % ROOM_GRADIENTS.length]}`} />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-sm font-semibold text-white truncate">{room.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-300">👥 참여 중</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      room.status === 'active'
                        ? 'bg-[#22C55E]/30 text-[#22C55E]'
                        : 'bg-white/20 text-white'
                    }`}>
                      {room.status === 'active' ? '진행 중' : '대기'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
