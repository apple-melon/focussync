'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMER_DEFAULTS } from '@/config/constants'
import type { TimerPhase, TimerSettings, TimerState, TimerControls } from '@/types/timer.types'
import { useTimerStorage } from './useTimerStorage'

function phaseSeconds(phase: TimerPhase, settings: TimerSettings): number {
  if (phase === 'focus') return settings.focusMinutes * 60
  if (phase === 'short_break') return settings.shortBreakMinutes * 60
  return settings.longBreakMinutes * 60
}

function nextPhase(current: TimerPhase, sessionCount: number, settings: TimerSettings): TimerPhase {
  if (current === 'focus') {
    return (sessionCount + 1) % settings.sessionsBeforeLongBreak === 0
      ? 'long_break'
      : 'short_break'
  }
  return 'focus'
}

interface UsePomodoroOptions {
  onPhaseComplete?: (phase: TimerPhase, focusSeconds: number) => void
  onBroadcast?: (phase: TimerPhase, timeLeft: number, sessionCount: number) => void
  onRunningChange?: (isRunning: boolean) => void
}

export function usePomodoro(options: UsePomodoroOptions = {}): [TimerState, TimerControls, TimerSettings] {
  const { loadSettings, saveSettings, loadState, saveState, clearState } = useTimerStorage()

  const [settings, setSettings] = useState<TimerSettings>(() => loadSettings())
  const [state, setState] = useState<TimerState>(() => {
    const persisted = loadState()
    const phase = persisted?.phase ?? 'focus'
    return {
      phase,
      timeLeft: persisted?.timeLeft ?? settings.focusMinutes * 60,
      isRunning: false,
      sessionCount: persisted?.sessionCount ?? 0,
      totalFocusSeconds: persisted?.totalFocusSeconds ?? 0,
    }
  })

  const rafRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)
  const lastBroadcastRef = useRef<number>(0)
  const stateRef = useRef(state)
  const settingsRef = useRef(settings)
  // Keep options in a ref so tick can always read the latest without being in deps
  const optionsRef = useRef(options)
  stateRef.current = state
  settingsRef.current = settings
  optionsRef.current = options

  const tick = useCallback(() => {
    const now = performance.now()
    const delta = (now - lastTickRef.current) / 1000
    lastTickRef.current = now

    // Broadcast timer state once per second so other participants stay in sync
    if (now - lastBroadcastRef.current >= 1000) {
      lastBroadcastRef.current = now
      const s = stateRef.current
      optionsRef.current.onBroadcast?.(s.phase, s.timeLeft, s.sessionCount)
    }

    setState((prev) => {
      const newTimeLeft = Math.max(0, prev.timeLeft - delta)
      const isFocus = prev.phase === 'focus'
      const newTotalFocus = isFocus ? prev.totalFocusSeconds + delta : prev.totalFocusSeconds

      if (newTimeLeft <= 0) {
        optionsRef.current.onPhaseComplete?.(prev.phase, Math.round(newTotalFocus))
        const s = settingsRef.current
        const newSessionCount = isFocus ? prev.sessionCount + 1 : prev.sessionCount
        const next = nextPhase(prev.phase, newSessionCount - 1, s)
        const autoStart = isFocus ? s.autoStartBreak : s.autoStartFocus
        return {
          phase: next,
          timeLeft: phaseSeconds(next, s),
          isRunning: autoStart,
          sessionCount: newSessionCount,
          totalFocusSeconds: newTotalFocus,
        }
      }

      return { ...prev, timeLeft: newTimeLeft, totalFocusSeconds: newTotalFocus }
    })

    rafRef.current = requestAnimationFrame(tick)
  }, []) // intentionally empty — all mutable state accessed via refs

  useEffect(() => {
    if (state.isRunning) {
      lastTickRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    optionsRef.current.onRunningChange?.(state.isRunning)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state.isRunning, tick])

  useEffect(() => {
    const handleUnload = () => {
      const s = stateRef.current
      saveState({ phase: s.phase, timeLeft: s.timeLeft, sessionCount: s.sessionCount, totalFocusSeconds: s.totalFocusSeconds, savedAt: Date.now() })
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [saveState])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && stateRef.current.isRunning) {
        setState((p) => ({ ...p, isRunning: false }))
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const controls: TimerControls = {
    start: () => setState((p) => ({ ...p, isRunning: true })),
    pause: () => setState((p) => ({ ...p, isRunning: false })),
    stop: () => {
      setState((p) => ({
        phase: 'focus',
        timeLeft: settingsRef.current.focusMinutes * 60,
        isRunning: false,
        sessionCount: p.sessionCount,
        totalFocusSeconds: p.totalFocusSeconds,
      }))
      clearState()
    },
    skip: () => {
      setState((p) => {
        const s = settingsRef.current
        const newSessionCount = p.phase === 'focus' ? p.sessionCount + 1 : p.sessionCount
        const next = nextPhase(p.phase, p.sessionCount, s)
        return { ...p, phase: next, timeLeft: phaseSeconds(next, s), sessionCount: newSessionCount }
      })
    },
    reset: () => {
      setState((p) => ({
        ...p,
        timeLeft: phaseSeconds(p.phase, settingsRef.current),
        isRunning: false,
      }))
    },
    updateSettings: (updates) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates }
        saveSettings(next)
        return next
      })
    },
  }

  return [state, controls, settings]
}
