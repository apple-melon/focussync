import { createClient } from '@/lib/supabase/server'
import { levelProgress, getLevelTier } from '@/lib/xp/formulas'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url, xp, streak_days, total_focus_minutes, created_at')
    .eq('id', user!.id)
    .single()

  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('earned_at, achievement:achievement_definitions(name, icon, xp_reward, rarity, description)')
    .eq('user_id', user!.id)
    .order('earned_at', { ascending: false })

  const { data: recentSessions } = await supabase
    .from('study_sessions')
    .select('started_at, focus_minutes, room:study_rooms(name)')
    .eq('user_id', user!.id)
    .order('started_at', { ascending: false })
    .limit(5)

  const xp = profile?.xp ?? 0
  const progress = levelProgress(xp)
  const tier = getLevelTier(progress.level)
  const totalHours = Math.floor((profile?.total_focus_minutes ?? 0) / 60)
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User'

  const RARITY_COLORS: Record<string, string> = {
    common: '#94A3B8', rare: '#3B82F6', epic: '#A855F7', legendary: '#EAB308',
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">프로필</h1>

      {/* Profile card */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 overflow-hidden"
            style={{ background: `${tier.color}22`, border: `2px solid ${tier.color}44` }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              : <span style={{ color: tier.color }}>{displayName[0]?.toUpperCase()}</span>}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{displayName}</h2>
              <span className="text-sm px-2.5 py-1 rounded-full border font-semibold" style={{ color: tier.color, borderColor: `${tier.color}50` }}>
                Lv.{progress.level} {tier.name}
              </span>
            </div>

            {/* XP bar */}
            <div className="space-y-1 max-w-sm">
              <div className="h-2.5 bg-[#0D0F14] rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full transition-all duration-700`}
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{progress.current.toLocaleString()} / {progress.required.toLocaleString()} XP</p>
            </div>

            {/* Stats row */}
            <div className="flex gap-6">
              <div>
                <p className="text-lg font-bold text-white">{totalHours}h</p>
                <p className="text-xs text-slate-500">총 집중 시간</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">🔥 {profile?.streak_days ?? 0}일</p>
                <p className="text-xs text-slate-500">연속 집중</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{achievements?.length ?? 0}개</p>
                <p className="text-xs text-slate-500">업적</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white mb-4">업적 ({achievements?.length ?? 0})</h3>
        {achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((ua, i) => {
              const ach = (Array.isArray(ua.achievement) ? ua.achievement[0] : ua.achievement) as { name: string; icon: string; xp_reward: number; rarity: string; description: string } | null
              if (!ach) return null
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#0D0F14] rounded-xl border border-white/10">
                  <span className="text-2xl flex-shrink-0">{ach.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{ach.name}</p>
                    <p className="text-xs font-medium" style={{ color: RARITY_COLORS[ach.rarity] ?? '#94A3B8' }}>
                      {ach.rarity}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-6">아직 업적이 없어요. 공부하면 달성할 수 있어요!</p>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white mb-4">최근 활동</h3>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.map((s, i) => {
              const room = (Array.isArray(s.room) ? s.room[0] : s.room) as { name: string } | null
              const diff = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 86400000)
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white">{room?.name ?? '개인 집중'}</p>
                    <p className="text-xs text-slate-500">{diff === 0 ? '오늘' : diff === 1 ? '어제' : `${diff}일 전`}</p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-[#6366F1]">{s.focus_minutes}분</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-6">아직 공부 기록이 없어요.</p>
        )}
      </div>
    </div>
  )
}
