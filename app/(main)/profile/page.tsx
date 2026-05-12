import { createClient } from '@/lib/supabase/server'
import { levelProgress, getLevelTier } from '@/lib/xp/formulas'
import { ProfileClient } from '@/components/profile/ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url, xp, streak_days, total_focus_minutes, daily_goal_minutes')
    .eq('id', user!.id)
    .single()

  const { data: achievementRows } = await supabase
    .from('user_achievements')
    .select('earned_at, achievement:achievement_definitions(name, icon, xp_reward, rarity, description)')
    .eq('user_id', user!.id)
    .order('earned_at', { ascending: false })

  const { data: sessionRows } = await supabase
    .from('study_sessions')
    .select('started_at, focus_minutes, room:study_rooms(name)')
    .eq('user_id', user!.id)
    .order('started_at', { ascending: false })
    .limit(8)

  // Today's focus minutes
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayRows } = await supabase
    .from('study_sessions')
    .select('focus_minutes')
    .eq('user_id', user!.id)
    .gte('started_at', today)

  // Count distinct study days as "completed goals"
  const { data: allDays } = await supabase
    .from('study_sessions')
    .select('started_at')
    .eq('user_id', user!.id)
  const studyDays = new Set((allDays ?? []).map((s) => s.started_at.slice(0, 10))).size

  const xp = profile?.xp ?? 0
  const progress = levelProgress(xp)
  const tier = getLevelTier(progress.level)
  const todayMinutes = (todayRows ?? []).reduce((sum, s) => sum + (s.focus_minutes ?? 0), 0)

  const achievements = (achievementRows ?? [])
    .map((ua) => {
      const ach = (Array.isArray(ua.achievement) ? ua.achievement[0] : ua.achievement) as {
        name: string; icon: string; xp_reward: number; rarity: string; description: string
      } | null
      if (!ach) return null
      return { ...ach, earned_at: ua.earned_at }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  const sessions = (sessionRows ?? []).map((s) => {
    const room = (Array.isArray(s.room) ? s.room[0] : s.room) as { name: string } | null
    return { started_at: s.started_at, focus_minutes: s.focus_minutes ?? 0, room_name: room?.name ?? null }
  })

  return (
    <ProfileClient
      userId={user!.id}
      displayName={profile?.display_name ?? user?.email?.split('@')[0] ?? 'User'}
      avatarUrl={profile?.avatar_url ?? null}
      level={progress.level}
      xpCurrent={progress.current}
      xpRequired={progress.required}
      xpPct={progress.pct}
      tierColor={tier.color}
      tierGradient={tier.gradient}
      tierName={tier.name}
      totalFocusMinutes={profile?.total_focus_minutes ?? 0}
      streakDays={profile?.streak_days ?? 0}
      studyDays={studyDays}
      dailyGoalMinutes={profile?.daily_goal_minutes ?? 360}
      todayMinutes={todayMinutes}
      achievements={achievements}
      sessions={sessions}
    />
  )
}
