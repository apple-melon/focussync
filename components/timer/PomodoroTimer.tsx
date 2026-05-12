'use client'

import { usePomodoro } from '@/hooks/timer/usePomodoro'
import { TimerRing } from './TimerRing'
import { TimerControls } from './TimerControls'
import { TimerSettings } from './TimerSettings'
import { TimerPresets } from './TimerPresets'
import type { TimerPhase } from '@/types/timer.types'

interface Props {
  onSessionComplete?: (focusMinutes: number) => void
  onBroadcast?: (phase: TimerPhase, timeLeft: number, sessionCount: number) => void
}

export function PomodoroTimer({ onSessionComplete, onBroadcast }: Props) {
  const [state, controls, settings] = usePomodoro({
    onPhaseComplete: (phase, focusSeconds) => {
      if (phase === 'focus' && onSessionComplete) {
        onSessionComplete(Math.round(focusSeconds / 60))
      }
    },
    onBroadcast,
  })

  const totalSeconds =
    state.phase === 'focus' ? settings.focusMinutes * 60
    : state.phase === 'short_break' ? settings.shortBreakMinutes * 60
    : settings.longBreakMinutes * 60

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Quick presets */}
      <TimerPresets settings={settings} controls={controls} isRunning={state.isRunning} />

      <TimerRing
        phase={state.phase}
        timeLeft={state.timeLeft}
        totalSeconds={totalSeconds}
        isRunning={state.isRunning}
        sessionCount={state.sessionCount}
      />
      <TimerControls
        isRunning={state.isRunning}
        phase={state.phase}
        controls={controls}
      />
      <TimerSettings settings={settings} controls={controls} />
    </div>
  )
}
