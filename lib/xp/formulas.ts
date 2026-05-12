import { XP_RULES } from '@/config/constants'

export function calcLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / XP_RULES.LEVEL_SCALE)) + 1
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * XP_RULES.LEVEL_SCALE
}

export function levelProgress(xp: number): { level: number; current: number; required: number; pct: number } {
  const level = calcLevel(xp)
  const currentLevelXP = xpForLevel(level)
  const nextLevelXP = xpForLevel(level + 1)
  const current = xp - currentLevelXP
  const required = nextLevelXP - currentLevelXP
  return { level, current, required, pct: Math.round((current / required) * 100) }
}

export function calculateSessionXP(
  focusMinutes: number,
  streakDays: number,
  isFullSession: boolean,
): number {
  if (focusMinutes < 1) return 0

  let xp = focusMinutes * XP_RULES.BASE_PER_MINUTE
  if (isFullSession) xp += XP_RULES.BONUS_FULL_SESSION

  const streakMultiplier = 1 + Math.min(streakDays, 30) * XP_RULES.BONUS_STREAK_MULTIPLIER
  return Math.round(xp * streakMultiplier)
}

export function getLevelTier(level: number): {
  name: string
  color: string
  gradient: string
} {
  if (level >= 50) return { name: '전설', color: '#EAB308', gradient: 'from-yellow-400 to-amber-500' }
  if (level >= 25) return { name: '에픽', color: '#A855F7', gradient: 'from-purple-400 to-pink-500' }
  if (level >= 10) return { name: '레어', color: '#3B82F6', gradient: 'from-blue-400 to-cyan-500' }
  if (level >= 5)  return { name: '언커먼', color: '#22C55E', gradient: 'from-green-400 to-emerald-500' }
  return { name: '커먼', color: '#94A3B8', gradient: 'from-slate-400 to-slate-500' }
}
