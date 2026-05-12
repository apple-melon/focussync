export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  xp: number
  level: number
  streak_days: number
  last_study_date: string | null
  total_focus_minutes: number
  created_at: string
}

export interface XPLog {
  id: string
  user_id: string
  amount: number
  reason: string
  session_id: string | null
  created_at: string
}

export interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  xp_reward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface UserAchievement {
  achievement_id: string
  user_id: string
  earned_at: string
  achievement: Achievement
}

export interface RankingEntry {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  xp: number
  level: number
  streak_days: number
  period: 'daily' | 'weekly' | 'all_time'
}
