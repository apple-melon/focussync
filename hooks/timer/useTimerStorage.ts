'use client'

import { useCallback } from 'react'
import { STORAGE_KEYS, TIMER_DEFAULTS } from '@/config/constants'
import type { TimerSettings, PersistedTimerState } from '@/types/timer.types'

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: TIMER_DEFAULTS.FOCUS_MINUTES,
  shortBreakMinutes: TIMER_DEFAULTS.SHORT_BREAK_MINUTES,
  longBreakMinutes: TIMER_DEFAULTS.LONG_BREAK_MINUTES,
  sessionsBeforeLongBreak: TIMER_DEFAULTS.SESSIONS_BEFORE_LONG_BREAK,
  autoStartBreak: TIMER_DEFAULTS.AUTO_START_BREAK,
  autoStartFocus: TIMER_DEFAULTS.AUTO_START_FOCUS,
  soundEnabled: true,
  broadcastTimer: true,
}

export function useTimerStorage() {
  const loadSettings = useCallback((): TimerSettings => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TIMER_SETTINGS)
      if (!raw) return DEFAULT_SETTINGS
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return DEFAULT_SETTINGS
    }
  }, [])

  const saveSettings = useCallback((settings: TimerSettings) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMER_SETTINGS, JSON.stringify(settings))
    } catch { /* quota exceeded */ }
  }, [])

  const loadState = useCallback((): PersistedTimerState | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TIMER_STATE)
      if (!raw) return null
      const state = JSON.parse(raw) as PersistedTimerState
      // Discard stale state older than 2 hours
      if (Date.now() - state.savedAt > 2 * 60 * 60 * 1000) return null
      return state
    } catch {
      return null
    }
  }, [])

  const saveState = useCallback((state: PersistedTimerState) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(state))
    } catch { /* quota exceeded */ }
  }, [])

  const clearState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TIMER_STATE)
  }, [])

  return { loadSettings, saveSettings, loadState, saveState, clearState }
}
