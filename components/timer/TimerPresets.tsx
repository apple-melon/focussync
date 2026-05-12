'use client'

import { cn } from '@/utils/cn'
import type { TimerControls, TimerSettings } from '@/types/timer.types'

const PRESETS = [
  { label: '15분', focus: 15, shortBreak: 3 },
  { label: '25분', focus: 25, shortBreak: 5 },
  { label: '50분', focus: 50, shortBreak: 10 },
  { label: '90분', focus: 90, shortBreak: 15 },
]

interface Props {
  settings: TimerSettings
  controls: TimerControls
  isRunning: boolean
}

export function TimerPresets({ settings, controls, isRunning }: Props) {
  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((p) => {
        const active = settings.focusMinutes === p.focus
        return (
          <button
            key={p.label}
            disabled={isRunning}
            onClick={() => {
              controls.updateSettings({ focusMinutes: p.focus, shortBreakMinutes: p.shortBreak })
              controls.reset()
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
              active
                ? 'bg-[#6366F1]/20 border-[#6366F1]/40 text-[#6366F1]'
                : 'bg-transparent border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20',
              isRunning && 'opacity-40 cursor-not-allowed',
            )}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
