export type TimerPhase = 'focus' | 'short_break' | 'long_break'

export interface TimerSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  autoStartBreak: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
  broadcastTimer: boolean
}

export interface TimerState {
  phase: TimerPhase
  timeLeft: number
  isRunning: boolean
  sessionCount: number
  totalFocusSeconds: number
}

export interface TimerControls {
  start: () => void
  pause: () => void
  stop: () => void
  skip: () => void
  reset: () => void
  updateSettings: (settings: Partial<TimerSettings>) => void
}

export interface PersistedTimerState {
  phase: TimerPhase
  timeLeft: number
  sessionCount: number
  totalFocusSeconds: number
  savedAt: number
}
