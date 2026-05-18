export const TIMER_DEFAULTS = {
  FOCUS_MINUTES: 25,
  SHORT_BREAK_MINUTES: 5,
  LONG_BREAK_MINUTES: 15,
  SESSIONS_BEFORE_LONG_BREAK: 4,
  AUTO_START_BREAK: true,
  AUTO_START_FOCUS: false,
} as const

export const TIMER_LIMITS = {
  FOCUS_MIN: 5,
  FOCUS_MAX: 90,
  SHORT_BREAK_MIN: 1,
  SHORT_BREAK_MAX: 30,
  LONG_BREAK_MIN: 5,
  LONG_BREAK_MAX: 60,
} as const

export const ROOM = {
  MAX_PARTICIPANTS: 20,
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  CODE_LENGTH: 6,
  CHAT_MESSAGE_MAX_LENGTH: 500,
  CHAT_HISTORY_LIMIT: 100,
} as const

export const STORAGE_KEYS = {
  TIMER_SETTINGS: 'focuswithme:timer:settings',
  TIMER_STATE: 'focuswithme:timer:state',
  THEME: 'focuswithme:theme',
} as const

export const COIN_REWARDS = {
  DAILY_LOGIN: 10,
  SESSION_COMPLETE: 5,
  DAILY_GOAL: 20,
  STREAK_MILESTONE: 50,
  ACHIEVEMENT: 15,
} as const

export const XP_RULES = {
  BASE_PER_MINUTE: 2,
  BONUS_FULL_SESSION: 50,
  BONUS_STREAK_MULTIPLIER: 0.1,
  LEVEL_SCALE: 100,
} as const

export const ACHIEVEMENT_IDS = {
  FIRST_SESSION: 'first_session',
  STREAK_3: 'streak_3',
  STREAK_7: 'streak_7',
  STREAK_30: 'streak_30',
  LEVEL_5: 'level_5',
  LEVEL_10: 'level_10',
  LEVEL_25: 'level_25',
  ROOM_HOST: 'room_host',
  SOCIAL_BUTTERFLY: 'social_butterfly',
  MARATHON: 'marathon',
} as const
