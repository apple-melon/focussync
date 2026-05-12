import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSession } from '@/lib/xp/anticheat'
import { calculateSessionXP, levelProgress } from '@/lib/xp/formulas'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { focusMinutes, sessionId } = body as { focusMinutes: number; sessionId: string }

  // Fetch session to validate timestamps
  const { data: session } = await supabase
    .from('study_sessions')
    .select('started_at, ended_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Fetch user for streak
  const { data: profile } = await supabase
    .from('users')
    .select('streak_days, xp')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const xpAmount = calculateSessionXP(focusMinutes, profile.streak_days, focusMinutes >= 25)

  const validation = validateSession({
    focusMinutes,
    startedAt: session.started_at,
    endedAt: session.ended_at ?? new Date().toISOString(),
    sessionCount: 1,
    reportedXP: xpAmount,
  })

  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 })
  }

  // Award XP via DB function
  const { data: newXP, error } = await supabase.rpc('award_xp', {
    p_user_id: user.id,
    p_amount: xpAmount,
    p_reason: `집중 세션 ${focusMinutes}분`,
    p_session_id: sessionId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totalXP = (profile.xp ?? 0) + xpAmount
  const progress = levelProgress(totalXP)

  // Check for new achievements
  const { data: newAchievements } = await supabase.rpc('check_and_grant_achievements', {
    p_user_id: user.id,
  })

  return NextResponse.json({
    xp: totalXP,
    ...progress,
    xpAwarded: xpAmount,
    newAchievements: newAchievements ?? [],
  })
}
